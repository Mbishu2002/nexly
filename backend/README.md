# Nexly API

FastAPI backend for Nexly. Serves the Expo app and the web front end from one
contract.

## Run it

```bash
docker compose up -d                 # Postgres + Redis
python -m venv .venv && .venv/Scripts/activate   # macOS/Linux: source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env                 # then fill in the blanks
uvicorn app.main:app --reload
```

Interactive docs at <http://localhost:8000/docs>. Tests: `pytest`.

## The locale contract

Clients send `Accept-Language: fr` or `en`. **Every response contains plain,
already-translated strings** — a `{fr, en}` object never crosses the wire.

Localized content is stored as paired `*_fr` / `*_en` columns and collapsed
once per request by `app.core.i18n.pick`. The header parser handles the full
grammar (`fr-CM,fr;q=0.9,en;q=0.8`), because the web client sends the long form
and the Expo client sends a bare tag.

French is the fallback, not English: Cameroon is the launch market and the
designs are French-first.

This is the server half of `frontend/lib/api/types.ts`. Those TypeScript types
and `app/schemas.py` must stay in step — the app deserializes straight into
them, so a mismatch is a runtime bug no compiler will catch.

## Payments are web-only

Per §6 of the architecture plan, the mobile apps show **no price, no checkout,
and no link to one**. That is what keeps them outside Apple's in-app purchase
requirement, so it is enforced here rather than left to discipline:

- `schemas.Teacher` has **no rate field**. The column exists
  (`Teacher.rate_xaf`) but is never serialized to a mobile route.
- All money lives under `/v1/web/` and `/v1/webhooks/`.
- `tests/test_contract.py` fails the build if a price-shaped field appears in
  the mobile DTO, or if a payment concern appears on a `/v1/me`, `/v1/teachers`
  or `/v1/sessions` path.

Students buy lesson packages on the web with Fapshi mobile money; the app
spends the resulting Pass credits.

### Fapshi

`app/services/fapshi.py`. Two details worth keeping:

- The webhook **re-queries** `payment-status` instead of trusting the POSTed
  body. The callback only says "something changed".
- Credits are granted on the *transition* to `successful`, not on callback
  arrival, so Fapshi's retries cannot double-credit an account.

## Teacher payouts

Fapshi has no native marketplace split, so `LedgerEntry` records gross, platform
fee and teacher payable for every booking. Entries start `held` (refund window
and disputes), become `payable`, then are batched into a `Payout`. Where a
provider has no disbursement API, the admin dashboard triggers payouts by hand.

## Layout

```
app/
  main.py            FastAPI app, CORS, /health
  core/
    config.py        settings, all env-driven
    i18n.py          Accept-Language -> locale; the pick() resolver
    security.py      JWT + password hashing
  db/session.py      engine + session (pool_pre_ping, for Neon)
  models.py          SQLAlchemy models
  schemas.py         response DTOs, mirroring the TS contract
  api/
    deps.py          DbSession, ReqLocale, CurrentUser, CurrentTeacher
    v1/routes/
      auth.py        register / login / me
      teachers.py    discovery, search, filters, reviews
      lessons.py     upcoming list, detail, reschedule
      threads.py     messaging, with block enforcement
      classroom.py   LiveKit join tokens, moderation reports
      payments.py    WEB ONLY: Fapshi checkout + webhook
  services/
    fapshi.py        mobile money
    livekit.py       join-token signing
```

## Built, and not yet built

**Working:** locale negotiation, email+password auth with JWT, teacher
discovery and search, lesson list/detail/reschedule, messaging with blocks,
LiveKit token minting with participant and time-window checks, Fapshi checkout
and an idempotent webhook, the payout ledger model, reports and blocks.

**Not yet:**

- **Migrations** — `alembic/` is scaffolded but holds no revision. The models
  are the source of truth; generate the first revision before deploying.
- **Seed data** — no fixtures are loaded, so the endpoints return empty lists
  against a fresh database. The Expo app still runs on its own mock adapter
  (`USE_MOCK = true`), which is why nothing is broken yet.
- **Google / Apple sign-in** — columns exist on `User`; the flows do not.
- Courses and progress are modelled but unserved; quizzes, the teacher portal,
  the admin dashboard, Arq jobs, R2 uploads and the transcoding pipeline are
  Phase 2.
