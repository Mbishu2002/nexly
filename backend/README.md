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
```

Interactive docs at <http://localhost:8000/docs>.

Seeded dev accounts (password `nexly-dev-password`): `franck@nexly.dev` is a
learner, `henriette@nexly.dev` is a teacher.

## Tests

```bash
pytest                                                    # SQLite, no services needed
TEST_DATABASE_URL=postgresql+psycopg://nexly:nexly@localhost:5432/nexly_test pytest
```

76 tests, green on both. SQLite keeps the suite fast; the Postgres run
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

- **Admin dashboard** — reports, blocks and the moderation queue are modelled
  and populated, but nothing renders them.
- **Web front end** — Vite + React. This is where checkout has to live, so it
  is the real blocker for revenue.
- **Arq jobs** — Redis is running; no workers yet. Needed for payout runs,
  booking reminders and transcoding.
- **Media pipeline** — R2 uploads, ffmpeg transcoding, signed CDN URLs.
- **Push and email** — FCM and Resend.
- **Group sessions**, automated content moderation, PostHog. All Phase 2.
