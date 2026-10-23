# Nexly — Technical Architecture and Build Plan

Language learning content platform, Cameroon launch. Draft v2, September 2026.

## 1. Overview

Nexly is a two-sided marketplace connecting language teachers with students,
modeled on Preply, built first for Cameroon with room to expand regionally.
Teachers offer live one-to-one or group video sessions plus pre-recorded
courses. Students discover, book, message, and consume lessons through web and
mobile apps.

This document lays out the proposed technical stack, the reasoning behind each
choice, pieces not covered by the original plan, a phased build order, and open
decisions that need answers before development starts.

## 2. Product Scope

### Core features

- Teacher profiles: bio, video intro, subjects, pricing, availability calendar
- Student discovery and search: filter by language, price, availability, rating
- Live one-to-one and group video sessions
- Pre-recorded courses: upload, organize into lessons, student progress tracking
- In-app messaging between student and teacher
- Booking and scheduling with timezone handling
- Quizzes and exercises attached to courses
- Subscriptions and lesson packages, purchased on the web
- Reviews and ratings
- Reporting and moderation tools, required for Apple approval
- Admin dashboard: user management, moderation queue, payouts, content review
- Push and email notifications: booking confirmations, reminders, messages

### Explicitly out of scope for MVP

- Group classes beyond a small fixed cap, for example more than six students
- Certificates or accreditation
- In-house currency or credits wallet beyond simple lesson packages
- Multi-language UI localization (launch in French and English only)

## 3. System Architecture

| Layer | Choice | Why |
|---|---|---|
| Backend API | FastAPI (Python) | Async native, good fit for live session state, webhooks, and background job orchestration. |
| Database | PostgreSQL on Neon | Serverless Postgres, branching for staging and preview environments, generous free tier for MVP. |
| Object storage | Cloudflare R2 | S3 compatible, zero egress fees. Matters once video streaming volume grows. |
| CDN | Cloudflare CDN in front of R2 | Needed for smooth video delivery to Cameroon and diaspora users, and enables signed URLs for access control. |
| Hosting (API) | Railway for MVP, migrate as load grows | Fast to ship on. Budget beyond the $5/month starter tier once video transcoding and live session load hit. |
| Live video | LiveKit, self-hosted or managed | Official, actively maintained Python server SDK built on asyncio, which fits FastAPI directly. Includes native session recording, which doubles as pre-recorded content. |
| Background jobs | Redis and Arq | Async native for FastAPI. Required for video transcoding, payout runs, reminders, and email digests. |
| Search | Postgres full-text search for MVP, Meilisearch later | Covers teacher and course discovery without adding infrastructure until scale demands it. |
| Email | Resend | Transactional and notification email. |
| Domain | Namecheap | Domain registration. |
| Web frontend | Vite and React for the app, lightweight SSR for public pages | Vite for the authenticated app. A thin SSR layer such as Astro or Next.js for teacher and course landing pages so they are indexable. |
| Mobile | React Native with Expo | Cross platform, faster iteration for a small team. |
| Auth | Google and Apple sign-in, plus email and password | Apple requires Sign in with Apple whenever another third-party login is offered. |
| Payments | Handled entirely on the web, no purchase flow inside the app | Keeps the mobile apps out of Apple's in-app purchase requirement. See §6. |
| Notifications | Firebase Cloud Messaging for push, Resend for email | Needed for booking reminders and message alerts. |
| Analytics | PostHog or similar | Needed for funnel and retention visibility from day one. |

## 4. Live Session Infrastructure

| Option | FastAPI fit | Notes |
|---|---|---|
| **LiveKit** | Strong. Official Python server SDK (`livekit-api`) built on asyncio and aiohttp, so token generation, room management, and webhook handling sit naturally inside FastAPI routes. | Open source, self-hostable or managed cloud. Built-in session recording, a natural source of on-demand content. Self-hosting still requires TURN and STUN for users behind restrictive NATs, common on mobile data in Cameroon. |
| Jitsi | Weaker. No first-party Python SDK. Token generation and room management must be hand-rolled against its REST and XMPP interfaces. | Open source and free, but more integration work to build and maintain. |
| Daily.co | Simple. Plain REST API, easy to call from FastAPI with httpx. | Fully managed, no self-hosted SFU or TURN to run. Costs more per minute in exchange for lower operations burden. |

**Recommendation:** LiveKit, for the best match with a FastAPI backend and for
self-hosting economics at scale. Daily.co is a reasonable fallback if the team
would rather pay per minute and avoid running video infrastructure at all while
validating the product.

## 5. Media and Video Pipeline

Uploading raw video files is not enough on its own. The pipeline needs:

- Upload, then a background transcoding job using ffmpeg, producing adaptive
  bitrate HLS output
- Storage of both original and transcoded renditions in R2
- CDN delivery with signed URLs so paid content cannot be shared as a public link
- Thumbnail generation for course and lesson listings

**Alternative:** Cloudflare Stream or Mux can absorb this entire pipeline
(upload, transcode, deliver) for a per-minute fee. Worth pricing against a
self-managed ffmpeg pipeline before deciding, since self-managing adds real
engineering time.

## 6. Payments and App Store Compliance

Nexly does not process payments inside the mobile apps. Students sign up and pay
for subscriptions or lesson packages on the Nexly website, using mobile money
through Fapshi, Campay, or MoMo. The mobile apps only authenticate an already
paying user and let them consume content and attend sessions they have already
purchased.

This keeps both the iOS and Android apps out of Apple's in-app purchase
requirement entirely. The rule that creates problems is directing users to pay
from inside the app: a link to a checkout page, a displayed price, or a
subscribe button. As long as none of that appears anywhere in the app, there is
no purchase flow for Apple to regulate, and no need for the External Purchase
Link Entitlement or in-app purchase integration.

- The app must never mention price, checkout, or subscription upgrades anywhere
  in its interface
- Account creation and payment happen only on the website
- The same account then logs into the mobile app to access purchased content and
  book sessions
- If a student's subscription lapses, the app can say access has ended and
  direct them generically to their account settings, without a direct purchase
  link or price

This should be reconfirmed against Apple's current App Review Guidelines closer
to submission, since enforcement of what counts as directing a user to an
external purchase has shifted over time.

## 7. Teacher Payouts

Nexly collects payment from students on the web and owes a share to teachers.
This is a marketplace split that Fapshi, Campay, and MoMo do not handle natively
as a two-sided payout system.

- Build an internal ledger recording, for every transaction, the gross amount,
  the platform fee, and the amount payable to the teacher
- Run payouts on a schedule, for example weekly, batching disbursements to
  teachers through the same providers' payout APIs where available
- If a provider lacks a disbursement API, plan for a manual, admin-triggered
  payout step in the admin dashboard as a stopgap
- Hold-back logic for disputed sessions or refund windows before a payout is
  finalized

## 8. Trust, Safety, and Moderation

Apple's moderation requirement for platforms with user-generated content and
communication between strangers usually expects more than a report button.

- A moderation queue in the admin dashboard with a defined response time, for
  example acting on reports within twenty-four hours
- Block and mute functionality between users
- Automated flagging for uploaded video and image content, in addition to user
  reports, if budget allows, using a hosted moderation API rather than building
  detection in house
- A clear, enforced Terms of Service covering teacher conduct, refunds, and
  account suspension

## 9. Phased Build Roadmap

### Phase 1: MVP

- Teacher and student onboarding, profiles, Google, Apple, and email auth
- Search and discovery using Postgres full-text search
- Booking and calendar with timezone handling
- Live one-to-one sessions using LiveKit
- Messaging
- Mobile money checkout on the web
- Admin dashboard: user management, basic moderation queue
- Push and email notifications for bookings

### Phase 2

- Pre-recorded courses with video transcoding pipeline and progress tracking
- Quizzes and exercises
- Group live sessions
- Automated content moderation
- Teacher payout automation

## 10. Open Decisions

- Confirm the final read of Apple's guidelines on directing users to external
  purchase, close to submission date
- Self-managed ffmpeg pipeline versus Cloudflare Stream or Mux for video; needs
  a cost comparison at expected volume
- Which mobile money provider or providers to integrate first. Fapshi, Campay,
  and MoMo differ in fees, disbursement API availability, and reliability —
  worth a short side-by-side test before committing to one as primary
- Group session cap and pricing model for Phase 2
