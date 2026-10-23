# Nexly

Language-learning marketplace for Cameroon — a two-sided platform connecting
heritage-language teachers with students. Built with **React Native + Expo**.

Prototype stage: every screen is navigable, bilingual (FR/EN), and reads through
an async API layer whose mock adapter can be swapped for a real backend without
touching a single screen.

## Run it

```bash
npm start          # Expo dev server
npm run android    # build & install the native Android app, then run it
npm run ios        # same for iOS (macOS only)
npm run web        # browser
npm run typecheck  # tsc --noEmit
```

The project has been **prebuilt**: `android/` holds a real native project, so
`npm run android` is `expo run:android` (a Gradle build) rather than Expo Go.
That is what makes the launcher icon, app name, and splash screen real.

`android/` and `ios/` are generated from `app.json` and git-ignored. Regenerate
them any time with:

```bash
npx expo prebuild --platform android --clean
```

Never hand-edit files under `android/` — `--clean` will discard the changes.
Express native config through `app.json` or a config plugin instead.

### Android SDK location

Gradle needs to know where the SDK is, or the build dies at configuration with
`SDK location not found`. Two ways, and the first is worth doing once:

```powershell
# permanent, survives `prebuild --clean` (PowerShell, then reopen the terminal)
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
```

Otherwise `android/local.properties` must exist:

```properties
sdk.dir=C:/Users/User/AppData/Local/Android/Sdk
```

That file is machine-specific and **`prebuild --clean` does not recreate it** —
it is the one thing you have to put back by hand after a clean prebuild, which
is exactly why the environment variable is the better fix.

## Architecture

Three layers, with one seam each:

```
screens (app/, components/)
    │  import { api } from "@/hooks/useApi"      ← the ONLY data entry point
    │  import { useI18n } from "@/lib/i18n"      ← the ONLY chrome-string source
    ▼
lib/api/index.ts          the seam: picks an adapter
    ├── mockAdapter.ts    resolves fixtures to the requested locale (today)
    └── httpAdapter.ts    fetch() against a real server (ready, not wired)
              ▼
        lib/api/fixtures.ts   the only place mock content lives
```

**No screen contains mock data or a hardcoded user-facing string.** Verified:
nothing outside `lib/api` imports `fixtures`, no screen imports an adapter
directly, and no literal accented copy remains in `app/`.

### Going live

1. Set `EXPO_PUBLIC_API_URL`.
2. Set `USE_MOCK = false` in `lib/api/index.ts`.
3. Delete `lib/api/fixtures.ts` and `lib/api/mockAdapter.ts`.

Nothing else changes. Both adapters implement the `NexlyApi` contract in
`lib/api/types.ts`, which is the wire format the server must satisfy —
`httpAdapter.ts` already lists every route (`/v1/teachers`, `/v1/me/courses`, …).

### Localisation

Two kinds of text, resolved two different ways:

| Kind | Source | Resolved by |
|---|---|---|
| UI chrome (buttons, headings, labels) | `lib/i18n/strings.ts` | `t("section", "key")` |
| Content (teacher bios, lesson topics, quiz items) | the API | locale sent per request |

The mock adapter resolves content from `Localized` (`{fr, en}`) fixtures; a real
server resolves it from `Accept-Language`. Either way **screens receive plain,
already-translated strings** — they never see a `{fr, en}` object.

`locale` is a dependency of every `useQuery`, so flipping the FR/EN toggle
re-translates the chrome *and* refetches content. Filters and search are keyed on
stable ids, never translated labels, so switching language never changes a
result set.

`en` is declared as `Dictionary` — the widened shape of `fr` — so a missing or
misspelt key is a compile error, not a blank label at runtime.

On launch the locale resolves in this order:

1. **the user's stored choice** (`AsyncStorage`, key `nexly.locale`) — an explicit
   pick always wins and survives a relaunch
2. **the device language** via `expo-localization`, if we ship it (`fr` from
   `fr-CM`, `en` from `en-GB`, …)
3. **French** — the launch market is Cameroon and the designs are French-first

The first paint is held back by one `AsyncStorage` read, so the app never renders
one language and visibly flips a frame later. Profile → app language shows which
of the two is in effect ("following your device language" vs "choice saved").

## Layout

```
app/                      expo-router file-based routes
  _layout.tsx             root Stack + LocaleProvider
  index.tsx               onboarding — language, goals, self-assessment

  (tabs)/                 LEARNER side
    discover.tsx          teacher search, filters, marketplace feed
    lessons.tsx           upcoming sessions, course progress, drill entry
    messages.tsx          thread list and chat
    profile.tsx           stats, language toggle, settings
  teacher/[id].tsx        teacher profile — languages, availability, reviews
  book/[id].tsx           booking — lesson type, slot picker, confirmation
  review/[id].tsx         post-session rating, highlights, public comment
  quiz/[id].tsx           audio tone drill — hearts, XP, per-question facts

  (teacher)/              TEACHER side
    schedule.tsx          day KPIs, next session, slot manager, automations
    roster.tsx            learner list, progress, notes, audio homework
    earnings.tsx          wallet, payout accounts, revenue charts, withdrawal
    me.tsx                profile, verification, mode switch
  apply.tsx               application & verification (step 3 of 4)

  classroom/[id].tsx      SHARED live session — video, whiteboard, notes
  report/[id].tsx         SHARED safety & moderation report

components/
  ui.tsx                  design-system primitives (Txt, Card, Chip, Button, …)
  Screen.tsx              Loader (shared loading/error) + LocaleToggle
  TeacherCard.tsx         marketplace listing card
  TeacherHeader.tsx       "Nexly · Teacher" app bar
  RevenueChart.tsx        weekly revenue bars

lib/
  theme.ts                Material 3 tokens + validated chart palette
  api/                    types, fixtures, adapters, the seam
  i18n/                   LocaleProvider, t(), dictionaries

hooks/
  useApi.ts               useQuery / useMutation (swap for TanStack Query later)

design/stitch/            source designs pulled from Google Stitch
  _ARCHITECTURE_PLAN.md   product & architecture spec
  html/ shots/            15 screens, 17 screenshots
  _index.json             screen manifest
```

## Navigating the prototype

**Learner:** onboarding → Discover → teacher profile → book → confirmation.
Lessons → "Rejoindre" opens the live classroom; hanging up lands on the review,
which links to the safety report. Lessons → "S'entraîner" opens the tone drill.

**Teacher:** Profile → "Devenir enseignant" → application → submit → teacher
tabs. Teacher Profil → "Passer en mode apprenant" switches back.

**Language:** the FR/EN toggle sits in the Discover header, the teacher header,
the onboarding header, and Profile → app language.

## Design source

Screens come from the Stitch project **Nexly Language Learning Platform**
(`8251235310158654444`), pulled via the Stitch MCP server. `design/stitch/` is
the reference; `lib/theme.ts` mirrors its Material 3 palette (seed `#295ea8`) and
fixtures reuse its copy, so app and design stay recognisably the same product.

## Brand assets

Everything in `assets/` is derived from one source file, the Nexly elephant
lockup, by `scripts/make-icons.py`. Re-run it if the logo changes:

```bash
python scripts/make-icons.py path/to/logo.png
```

| File | What it is | Why it differs |
|---|---|---|
| `icon.png` | full lockup, 1024², **opaque** | iOS rejects app icons with an alpha channel |
| `adaptive-icon.png` | elephant only, transparent | Android composites it over `#ffffff` |
| `adaptive-icon-monochrome.png` | same shape, solid black | Android 13+ themed icons |
| `splash-icon.png` | full lockup, transparent | shown on the `#faf8ff` app surface |
| `favicon.png` | elephant only, 196² | web |
| `logo.png` | full lockup at source resolution | in-app use (headers, onboarding) |

Two decisions worth keeping:

**The launcher icon drops the wordmark.** At 48dp "Nexly" is an unreadable
smudge; the elephant alone still reads. The full lockup lives on the splash and
in-app, where there is room for it.

**The mark is scaled to 54% of the adaptive canvas, and that number was
measured, not eyed.** Android draws adaptive icons on a 108dp canvas and masks
them to a 66dp circle — 61% of the canvas, not 66%. The elephant is wide-eared,
so it overruns that circle far earlier than a square logo would: at 72% scale a
round launcher clips **20%** of its ink, and at 64% it still clips 9.8%. 54% is
the largest scale where nothing clips at all. `make-icons.py` prints the whole
table and picks the top passing row, so this stays honest if the logo is
redrawn.

## Two constraints worth knowing

**No prices or checkout in the app.** Per `_ARCHITECTURE_PLAN.md` §3, this avoids
the 30% App Store IAP fee. The app books against Pass credits; student payment
(MTN MoMo, Orange Money, Campay/Fapshi) lives on the web. Teacher *payouts* are a
separate flow and do appear in-app.

**Chart colors are validated, not chosen by eye.** `lib/theme.ts` exports a
`chart` token set that passes all six checks of the dataviz validator against the
`#faf8ff` surface. The obvious M3 picks fail: `primary` `#003e80` is outside the
lightness band, and `primary`↔`tertiary` is ΔE 12.0 in normal vision — genuinely
indistinguishable. Re-run the validator before changing them.

## Not built yet

- **Backend** — no server exists. Auth, LiveKit video (the classroom is a UI
  shell), Mobile Money, push/email, admin dashboard.
- **Caching** — `useQuery` has no cache or dedupe by design; swap in TanStack
  Query when there's a real network to be careful about.
- **Web static rendering** — `web.output` is `single` (SPA); static output needs
  an `@expo/router-server` / `expo-router` pairing that doesn't align in SDK 57.
- **Visual verification** — no screen has been seen rendering. Typecheck and
  bundle pass; run it on a device.
