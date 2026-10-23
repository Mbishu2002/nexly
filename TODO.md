# TODO

Everything outstanding, grouped by what it blocks. Phase references are to
`design/stitch/_ARCHITECTURE_PLAN.md` §9.

Status key: **[blocker]** stops launch · **[next]** ready to pick up ·
**[blocked]** waiting on a decision · **[later]** Phase 2+

---

## 1. Blocks launch

### [blocker] Admin dashboard
Reports, blocks and moderation flags are all modelled and populated — nothing
renders them. App Review expects a moderation queue with a stated response
time (§8 says 24h), not just a report button, so this gates iOS submission.

Needs: queue view over `Report` + `ModerationFlag`, actioned/dismissed
transitions, user suspend (`User.is_suspended` already exists), and an audit
trail of who actioned what.

### [blocker] Web front end (Vite + React)
Checkout has to live on the web — that is the whole reason the app shows no
prices (§6). Until it exists there is no way to buy a Pass, so the app has
nothing to spend.

Minimum: sign-up/sign-in, package selection, Fapshi checkout against
`POST /v1/web/checkout`, and a post-payment landing page. Teacher and course
landing pages need SSR for indexing; the authenticated app does not.

### [blocker] Wire the app to the backend
The Expo app still runs entirely on its mock adapter. The server implements
every route it calls, but nothing has ever talked to it.

- [ ] Set `USE_MOCK = false` in `frontend/lib/api/index.ts`, set
      `EXPO_PUBLIC_API_URL`
- [ ] Add auth: no sign-in screen exists at all. Needs email/password plus
      Google and Apple buttons against `/v1/auth/*`, and token storage
- [ ] Attach `Authorization` in `httpAdapter.ts` — it currently sends none,
      so every `/v1/me/*` call would 401
- [ ] Walk every screen against real data and fix what breaks

### [blocker] Deploy
Nothing is deployed. Railway for the API (§3), Neon for Postgres, a managed
Redis for Arq, and the worker as a second process.

- [ ] Public callback URL for the Fapshi webhook — it cannot work from
      localhost
- [ ] `FAPSHI_WEBHOOK_SECRET` set; the handler refuses to run unauthenticated
      outside `env=local`
- [ ] LiveKit project + `LIVEKIT_*` credentials
- [ ] Run `alembic upgrade head` on deploy

---

## 2. Ready to build

### [next] Frontend: live messaging
The WebSocket server is done and tested; the app has no client.

- [ ] Connect to `/v1/ws/threads/{id}?token=<jwt>` from `app/chat/[id].tsx`
- [ ] Render `typing` and `read` frames
- [ ] Reconnect with backoff; fall back to REST polling while disconnected
- [ ] Handle the 4401/4403/4404 close codes distinctly

### [next] Frontend: push notifications
- [ ] Request permission, get the FCM token, POST `/v1/me/devices`
- [ ] Deep-link `{type: "message"|"lesson"}` payloads to the right screen
- [ ] Unregister on sign-out (`DELETE /v1/me/devices/{token}`)

### [next] Frontend: group sessions
`/v1/group-sessions` and join/leave exist, with no UI.

### [next] Frontend: media upload
Three-step presigned flow is server-side only. Needed for teacher intro
videos (part of the application flow) and homework audio.

### [next] Course entitlements
`GET /v1/media/{id}` currently allows **the owner only**, so a learner cannot
play a course they bought. Needs an entitlement check against purchase or
enrolment. Deliberately strict for now — better to refuse than leak paid media.

### [next] CI
No automation. Run `pytest` (both SQLite and Postgres), `tsc --noEmit`, and
`ruff` on every push.

### [next] Rebuild the Android project
`android/` was generated before the monorepo move, so its baked absolute paths
are stale. Run `npx expo prebuild --platform android --clean` in `frontend/`,
then rebuild. Also set `ANDROID_HOME` permanently so `local.properties` stops
being needed:

```powershell
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
```

### [next] Visual verification
Only Discover, Lessons, Messages, chat and lesson-details have ever been seen
rendering, and that was on mock data. Nothing since the price removal or the
`sendMessage` contract change has been looked at on a device.

---

## 3. Waiting on a decision

### [blocked] Video transcoding
`transcode_media` is the seam and handles audio; the encoder is not written.
Blocked on the open decision in §10: self-managed ffmpeg versus Cloudflare
Stream versus Mux. Needs a cost comparison at expected volume before either
path is worth building.

### [blocked] Teacher payout disbursement
`run_payout_batch` reports what is owed and moves nothing, because §10 has not
settled which of Fapshi, Campay or MoMo exposes a disbursement API. Until
then, payouts are an admin action.

Also needs: hold-back rules for disputed sessions beyond the current
`PAYOUT_HOLD_HOURS` window.

### [blocked] Mobile money provider choice
§10: Fapshi, Campay and MoMo differ on fees, disbursement availability and
reliability. Only Fapshi is integrated. Worth a side-by-side test before
committing to one as primary.

### [blocked] Apple external-purchase guidelines
§6 says to reconfirm close to submission, since enforcement of what counts as
"directing a user to an external purchase" has shifted. The app currently
shows no price anywhere and the contract tests keep it that way.

---

## 4. Phase 2

- [later] Pre-recorded courses end to end — `Course`/`CourseProgress` are
  modelled and served, but there is no lesson player and no upload flow
- [later] Quizzes beyond the seeded tone drill — authoring, more question
  types, spaced repetition
- [later] Hosted moderation classifier. The built-in heuristic is a narrow
  floor: off-platform payment steering, contact swapping, a few slurs. Set
  `MODERATION_API_URL` to layer a real classifier over it
- [later] Group sessions beyond the cap of 6, and their pricing model (§10)
- [later] Certificates and accreditation — explicitly out of MVP scope
- [later] PostHog dashboards. Server-side capture works; no funnels defined
- [later] Meilisearch, if Postgres full-text search stops scaling

---

## 5. Known debt

- **`frontend/lib/api/types.ts` and `backend/app/schemas.py` are kept in step
  by hand.** `test_contract_coverage.py` catches a missing *route*; it does
  not catch a mismatched *field*. A shape mismatch is a runtime bug no
  compiler sees. Generating the TS types from the OpenAPI schema would close
  this properly.
- **No rate limiting** on auth, messaging or report submission.
- **No structured logging or error tracking** (Sentry or equivalent).
- Starlette warns that `TestClient` with `httpx` is deprecated in favour of
  `httpx2`.
