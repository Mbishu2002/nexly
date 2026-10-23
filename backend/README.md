# Nexly API

FastAPI backend for Nexly. Serves the Expo app and the web front end from one
contract.

## Run it

```bash
docker compose up -d                              # Postgres + Redis
python -m venv .venv && .venv/Scripts/activate    # macOS/Linux: source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env                              # then fill in the blanks
alembic upgrade head
python -m app.db.seed                             # dev data matching the app's fixtures
uvicorn app.main:app --reload

# in a second terminal -- reminders, payout settlement, transcoding
arq app.worker.WorkerSettings
```

Interactive docs at <http://localhost:8000/docs>.

Seeded dev accounts (password `nexly-dev-password`): `franck@nexly.dev` is a
learner, `henriette@nexly.dev` is a teacher.

## Tests

```bash
pytest                                                    # SQLite, no services needed
TEST_DATABASE_URL=postgresql+psycopg://nexly:nexly@localhost:5432/nexly_test pytest
```

121 tests, green on both. SQLite keeps the suite fast; the Postgres run
exercises the `JSONB` and `TIMESTAMPTZ` paths SQLite cannot, so a bug that only
appears on the real database still gets caught.

`tests/test_contract_coverage.py` parses the route list **out of**
`frontend/lib/api/httpAdapter.ts` rather than keeping its own copy. Add a call
on the client without adding the endpoint here and the suite fails, instead of
the app 404-ing in someone's hands.

## The locale contract

Clients send `Accept-Language: fr` or `en`. **Every response contains plain,
already-translated strings** — a `{fr, en}` object never crosses the wire.

Localized content is stored as paired `*_fr` / `*_en` columns and collapsed
once per request by `app.core.i18n.pick`. The header parser handles the full
grammar (`fr-CM,fr;q=0.9,en;q=0.8`), because the web client sends the long form
and the Expo client sends a bare tag. French is the fallback, not English:
Cameroon is the launch market and the designs are French-first.

This is the server half of `frontend/lib/api/types.ts`. Those TypeScript types
and `app/schemas.py` must stay in step — the app deserializes straight into
them, so a mismatch is a runtime bug no compiler will catch.

## Payments are web-only

Per §6 of the architecture plan, the mobile apps show **no price, no checkout,
and no link to one**. That is what keeps them outside Apple's in-app purchase
requirement, so it is enforced here rather than left to discipline:

- `schemas.Teacher` has **no rate field**. The column exists
  (`Teacher.rate_xaf`) but is never serialized to a mobile route.
- All student money lives under `/v1/web/` and `/v1/webhooks/`.
- Booking without credits returns 402 with a message that names no price and
  offers no way to buy — topping up is a web journey.
- `tests/test_contract.py` fails the build if a price-shaped field appears in
  the mobile DTO, or if a payment concern appears on a `/v1/me`, `/v1/teachers`
  or `/v1/sessions` path.

Teacher **payouts** are the exception and do live on a mobile route: money
going out is not a purchase, and nothing in that flow offers anything to buy.

### Fapshi

`app/services/fapshi.py`. Two details worth keeping:

- The webhook **re-queries** `payment-status` instead of trusting the POSTed
  body. The callback only says "something changed".
- Credits are granted on the *transition* to `successful`, not on callback
  arrival, so Fapshi's retries cannot double-credit an account.

## Sign-in

Email + password, Google, and Apple. Apple ships alongside Google rather than
after it, because App Review requires Sign in with Apple as soon as any other
third-party login is offered.

ID tokens are verified properly — JWKS fetched and cached, `kid` matched,
RS256 signature, issuer, audience and expiry all checked. An unverified JWT is
just attacker-supplied JSON, so skipping any of that turns "sign in with
Google" into "sign in as anyone".

Accounts are matched on `(provider, subject)`, never on email alone: the
subject is stable and unique, an email is neither, and Apple's Hide My Email
issues a different relay address per app. Email is used only to *link* a
provider to an existing password account, and only when the provider says it
verified that address.

## Live sessions (LiveKit)

- `POST /v1/sessions/{id}/token` mints a join token scoped to that room only.
- `POST /v1/sessions/{id}/join` returns the token **and** the opening board
  state together — two round-trips is a visible delay on mobile data.
- Both check the caller is actually a participant and that the classroom is
  open (10 minutes before the start); otherwise 403 or 425.
- `POST /v1/sessions/livekit/webhook` handles `room_finished`: it marks the
  lesson completed and moves the teacher's ledger entry from `held` to
  `payable`, so money follows the session actually happening rather than a
  timer.

Tokens are signed JWTs carrying a `video` grant. Unconfigured LiveKit returns
503 rather than handing out something unusable.

## Live messaging (WebSocket)

`/v1/ws/threads/{id}?token=<jwt>` — the token is a query parameter because
React Native's WebSocket cannot set headers.

Frames in: `message`, `typing`, `read`, `ping`.
Frames out: `message`, `typing`, `read`, `pong`, `error`.

**Fan-out goes through Redis pub/sub, not an in-memory registry.** A socket is
held by one process, so with two API workers a message sent on worker A would
never reach a socket on worker B — and an in-memory map looks perfectly
correct on one worker in development, which is what makes it dangerous. Local
delivery is the last hop of the same path, so the single- and multi-worker
cases cannot diverge.

Sessions are opened **per frame**, not held for the life of the socket. A chat
connection can stay open for an hour; a pooled connection per socket would let
a few hundred idle chats exhaust the database.

Blocks are re-checked on every message rather than at connect, because a block
can be set while the socket is open. Each message is classified before it is
stored, so a withheld message never lands in the thread at all.

## Background jobs (Arq)

    arq app.worker.WorkerSettings

| Job | Trigger | Notes |
|---|---|---|
| `send_message_push` | queued from the socket | so FCM latency never stalls a chat |
| `send_booking_confirmation` | queued on booking | |
| `transcode_media` | queued on upload completion | seam only; see below |
| `send_booking_reminders` | every 5 min | de-duplicated by `NotificationLog` |
| `settle_ledger` | 03:00 daily | `held` → `payable` after the refund window |
| `reap_abandoned_uploads` | 04:00 daily | rows whose bytes never arrived |
| `run_payout_batch` | Fridays 06:00 | **reports only, moves no money** |

Every cron job is idempotent: Arq can re-run one after a restart, and "twice"
must not mean two reminders or two payouts.

`settle_ledger` releases money only for lessons that actually **completed** — a
held entry on a cancelled or no-show session must not become payable just
because time passed. `run_payout_batch` deliberately stops at reporting: which
providers expose a disbursement API is still an open decision in the
architecture plan, and moving money on a schedule before that is settled is
the wrong kind of automatic.

## Media (Cloudflare R2)

Three steps, so the server never proxies bytes:

```
POST /v1/media/uploads        -> presigned PUT + asset id
PUT  <presigned url>          -> client uploads straight to R2
POST /v1/media/{id}/complete  -> verify the object, queue transcoding
GET  /v1/media/{id}           -> short-lived signed playback URL
```

- **Nothing is public.** Paid lesson video must not be shareable as a plain
  link, so playback is always signed and short-lived.
- The uploader's filename never becomes the storage key — it is
  attacker-controlled and would allow overwriting someone else's object.
- `ContentType` and `ContentLength` are inside the signature, so a URL issued
  for a 5 MB audio clip cannot be used to upload a 2 GB executable.
- "Upload finished" from a client is a claim, not evidence: `/complete`
  HEADs the object before anything downstream depends on it.

**The ffmpeg encoder is not implemented.** `transcode_media` records state and
handles audio (which needs no renditions); HLS transcoding drops in behind it
once the open decision — self-managed ffmpeg versus Cloudflare Stream or Mux —
is settled.

## Notifications

Resend for email, FCM HTTP v1 for push. Both senders return a result instead
of raising: a booking is still a booking if the confirmation email bounces.

`NotificationLog` is keyed on `(user, kind, dedupe_key)`, so a re-run of the
reminder cron is a no-op rather than a second buzz at 6am. Tokens FCM reports
as `UNREGISTERED` are deactivated, not deleted. A device token that reappears
under a different account is reassigned, not duplicated — otherwise the
previous owner of a shared handset keeps receiving the new owner's messages.

## Automated moderation

Two tiers: a hosted classifier when `MODERATION_API_URL` is set, otherwise a
local heuristic. If the hosted call fails the heuristic still runs, because an
outage must not silently mean "everything is fine".

The heuristic is deliberately narrow — off-platform payment steering, contact
details being swapped, a handful of slurs — and it is a floor, not a
substitute for the hosted classifier or for human review. **Nothing
auto-bans.** The strongest action is withholding one message and opening a
`ModerationFlag` for a person to look at.

## Analytics (PostHog)

Server-side capture, so funnel events survive the app being closed mid-flow.
Fire-and-forget: an analytics outage must not become a 500 on a booking.

Event properties are filtered against a deny-list before sending — no message
text, comments, notes, emails, phone numbers or names ever leave the system.
Analytics is the easiest place for personal data to leak out unnoticed, and
this is a marketplace with minors' schooling on it.

## Group sessions

A group lesson is a `Lesson` with `capacity > 1`; its roster lives in
`LessonParticipant`. Joining locks the roster before counting seats, or two
learners racing for the last one both read "1 left" and both get in. Leaving
before the start refunds the credit. `MAX_GROUP_SIZE` (default 6) is enforced,
per the MVP cap in the architecture plan.

## Teacher payouts

Fapshi has no native marketplace split, so `LedgerEntry` records gross,
platform fee and teacher payable for every booking. Entries start `held`
(refund window and disputes), become `payable` when the session completes, then
are attached to a `Payout` — each payout is backed by specific ledger rows
rather than a floating balance.

## Layout

```
app/
  main.py            FastAPI app, CORS, /health
  catalog.py         static bilingual reference data
  models.py          SQLAlchemy models (22 tables)
  schemas.py         response DTOs mirroring the TS contract
  core/
    config.py        settings, all env-driven
    i18n.py          Accept-Language -> locale; the pick() resolver
    security.py      bcrypt + JWT
  db/
    session.py       engine + session (pool_pre_ping, for Neon)
    seed.py          dev data
  api/
    deps.py          DbSession, ReqLocale, CurrentUser, CurrentTeacher
    v1/routes/
      onboarding.py     first-run catalogue
      auth.py           register / login / google / apple / me
      teachers.py       discovery, search, filters, reviews
      learner.py        profile, recorded courses
      lessons.py        upcoming, detail, reschedule
      threads.py        messaging, with block enforcement
      booking.py        availability, lesson types, create booking
      quizzes.py        tone drills
      classroom.py      LiveKit, session state, review, moderation
      teacher_portal.py schedule, roster, resources, earnings, payouts
      application.py    teacher onboarding
      payments.py       WEB ONLY: Fapshi checkout + webhook
  services/
    fapshi.py        mobile money
    livekit.py       join-token signing
    oauth.py         Google / Apple ID-token verification
```

## Notes on the data layer

- Column types are portable: `JSON().with_variant(JSONB, "postgresql")` and
  text ids, so the same mappings run on Neon and on SQLite under test.
- `UtcDateTime` normalises every timestamp to aware UTC on read. Postgres
  returns aware datetimes and SQLite returns naive ones; comparing the two
  raises `TypeError`, and fixing that in the column type means it cannot be
  forgotten at a call site.
- `bcrypt` is used directly, not through passlib, which has been unmaintained
  since 2020 and breaks against bcrypt 5.x. Passwords are SHA-256'd before
  hashing so the whole password counts — bcrypt silently truncates at 72 bytes.

## Not yet built

- **Admin dashboard** — reports, blocks and moderation flags are modelled and
  populated, but nothing renders them. This is an App Review requirement.
- **Web front end** — Vite + React. Checkout has to live there, so it is the
  real blocker for revenue.
- **ffmpeg / HLS transcoding** — `transcode_media` is the seam; the encoder
  is not written. Pending the Stream-vs-Mux-vs-self-managed decision.
- **Course entitlements** — `GET /v1/media/{id}` currently allows the owner
  only. Serving a purchased course to its buyer needs an entitlement check.
- **Provider disbursement** — `run_payout_batch` reports; it does not pay.
- **Certificates, accreditation, PostHog dashboards.**
