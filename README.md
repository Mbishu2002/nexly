# Nexly

Language-learning marketplace for Cameroon — a two-sided platform connecting
heritage-language teachers with students. Live one-to-one video lessons,
messaging, booking, and pre-recorded courses, in French and English.

```
nexly/
├── frontend/   React Native + Expo app        (see frontend/README.md)
├── backend/    FastAPI + Postgres API         (see backend/README.md)
└── design/     Stitch source designs & the architecture plan
```

## Quick start

```bash
# API
cd backend
docker compose up -d
python -m venv .venv && .venv/Scripts/activate
pip install -e ".[dev]"
cp .env.example .env
alembic upgrade head
python -m app.db.seed                # learner + teacher dev accounts
uvicorn app.main:app --reload        # http://localhost:8000/docs

# App
cd ../frontend
npm install
npm start
```

## How the two fit together

The app talks to the API through a single seam. `frontend/lib/api/index.ts`
picks an adapter:

```
screens  ->  lib/api/index.ts  ->  mockAdapter    fixtures, offline (today)
                               \-> httpAdapter    fetch() against backend/
```

Both implement the same `NexlyApi` contract in `frontend/lib/api/types.ts`,
which is also the wire format `backend/app/schemas.py` must satisfy. Flipping
`USE_MOCK` to `false` and setting `EXPO_PUBLIC_API_URL` moves the app onto the
real server without touching a single screen.

Every route the app calls is implemented, migrated and seeded. The app is
still pointed at the mock adapter by default; flip it when you want to develop
against the server:

```bash
cd backend && alembic upgrade head && python -m app.db.seed && uvicorn app.main:app --reload
# then in frontend/lib/api/index.ts set USE_MOCK = false
# and export EXPO_PUBLIC_API_URL=http://localhost:8000
```

`backend/tests/test_contract_coverage.py` parses the route list straight out of
`frontend/lib/api/httpAdapter.ts`, so the two cannot drift apart silently.

### Language

Two kinds of text, resolved two different ways:

| Kind | Source | Resolved by |
|---|---|---|
| UI chrome (buttons, labels) | `frontend/lib/i18n/strings.ts` | `t("section", "key")` |
| Content (bios, lesson topics) | the API | `Accept-Language` per request |

Screens only ever receive plain strings. The mock adapter resolves them from
`{fr, en}` fixtures; the server resolves them from paired `*_fr` / `*_en`
columns. French is the fallback on both sides.

## Two constraints worth knowing

**No prices or checkout in the app.** Per `design/stitch/_ARCHITECTURE_PLAN.md`
§6, the mobile apps must never show a price, a checkout, or a link to one —
that is what keeps them outside Apple's in-app purchase requirement. Students
buy lesson packages on the web via Fapshi mobile money; the app spends the
resulting Pass credits. This is enforced, not just documented: the mobile
`Teacher` DTO has no rate field on either side of the wire, all money routes
live under `/v1/web/`, and `backend/tests/test_contract.py` fails the build if
either slips.

**Chart colors are validated, not chosen by eye.** `frontend/lib/theme.ts`
exports a `chart` token set that passes all six checks of the dataviz
validator. The obvious Material 3 picks fail: `primary` `#003e80` is outside the
lightness band, and `primary`↔`tertiary` is ΔE 12.0 in normal vision — genuinely
indistinguishable.

## Stack

| Layer | Choice |
|---|---|
| Mobile | React Native + Expo (expo-router) |
| Web | Vite + React *(not started)* |
| API | FastAPI (Python 3.12+) |
| Database | PostgreSQL — Neon in staging/production |
| Live video | LiveKit (tokens + room webhooks) |
| Payments | Fapshi mobile money, **web only** |
| Auth | email + password, Google, Apple |
| Jobs | Redis + Arq (reminders, settlement, transcoding) |
| Messaging | WebSocket + Redis pub/sub |
| Storage / CDN | Cloudflare R2 (signed upload + playback) |
| Email / Push | Resend, Firebase Cloud Messaging |
| Analytics | PostHog (server-side) |

Full reasoning, the phased roadmap and the open decisions are in
`design/stitch/_ARCHITECTURE_PLAN.md`.
