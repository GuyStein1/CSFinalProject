# FixIt — Project Submission

**A location-based task marketplace that connects people who need small jobs done with skilled locals who get them done.** Post a task, receive competitive bids from nearby Fixers, chat, agree, and get it done — all in one app, on web and mobile.

**Team:** Guy Stein · Guy Zilber · Guy Shick

---

## 1. Repository & Live Demo

| | |
|---|---|
| **Source code** | <https://github.com/GuyStein1/CSFinalProject> |
| **Live web app** | <https://fixit-one-mocha.vercel.app> |
| **Demo accounts** | The project README's "Try it now" section ([README.md → Try it now](../README.md#try-it-now)) links to [`docs/Demo_Users.md`](Demo_Users.md), which lists pre-populated Requester, Fixer, and Admin accounts already wired with tasks, bids, chats, notifications, and reviews. |
| **Shared demo password** | `guyguyguy` (for every demo account) |
| **Example open tasks on the map** | Located in **Tel Aviv** — in Fixer mode, search "Tel Aviv" in the discovery map to see them. |

No registration is required to evaluate the project — sign in with any demo account and the app is immediately populated.

---

## 2. System Requirements

### 2.1 Functional Requirements

What the system must do, grouped by capability.

**Authentication & Account Management**
- Users register with email + password (Firebase Authentication), or via Google sign-in.
- Email verification, password reset, and silent token refresh handled by Firebase.
- Each user has a single unified account with **two roles** — Requester and Fixer — switchable from the top bar.
- Users can edit their profile, change their phone number, toggle the UI language, and delete their account (which cancels active tasks and anonymizes past reviews).
- Idle auto-logout after a period of inactivity.

**Task Creation & Discovery**
- Requesters post tasks via a guided multi-step wizard: title, description, up to 5 photos, category (9 options), budget (fixed price or "Quote Required"), and a two-part location (public discovery pin + private exact address revealed only on bid acceptance).
- Requesters can edit any field of an `OPEN` task before a bid is accepted.
- Fixers discover tasks on a Google Map (color-coded category pins) or a sortable/filterable list view; filters cover distance radius, category, and price range.
- A 15-bid cap per task prevents notification overload and creates urgency for early bidders.

**Bidding System**
- Each bid contains a price offer (₪) and a pitch message. One bid per Fixer per task (DB unique constraint).
- Fixers can edit, withdraw, and reactivate their own `PENDING` bid while the task is still open.
- Requesters review all bids on a task, can open the Fixer's full public profile from any bid card, and accept or manually reject a bid.
- Accepting one bid: task moves `OPEN → IN_PROGRESS`, the exact address is revealed to the winning Fixer, all other `PENDING` bids are auto-rejected (each stamped with the winning price/rating for context), and the Fixer is push-notified.
- If a Fixer who was accepted needs to back out, `cancel-accepted` returns the task to `OPEN`.

**Task Lifecycle (State Machine)**
- `OPEN → IN_PROGRESS → COMPLETED` is the happy path; `CANCELED` is a terminal off-ramp; `OPEN ← CANCELED` is the reopen path.
- Completion is **payment-first and two-sided**: the Requester first confirms payment was sent (external Bit/Paybox deep-link, no in-app processing), then both parties must confirm completion before the task flips to `COMPLETED`.
- A 14-day review window opens on completion.

**Real-Time Chat**
- Per-task chat rooms over Socket.io with a REST fallback for history (`GET /api/tasks/:id/messages`).
- The Requester can chat with any Fixer who has a `PENDING` or `ACCEPTED` bid on the task — pre-acceptance chat is supported and is Requester-initiated only.
- Read receipts (✓ sent, ✓✓ read) with real-time updates.
- Offline parties receive a push notification per new message.
- Chat is read-only when the task is `COMPLETED` or `CANCELED` (history preserved with a lock-bar in the UI).

**Notifications**
- Push notifications via the Expo Push Service for: new bid received, bid accepted/rejected, new message (recipient offline), task completed, certification/verification reviewed.
- In-app Notification Center (bell icon) lists all events chronologically; unread items are highlighted and deep-link to the relevant screen.

**Reviews & Reputation**
- After completion, the Requester rates the assigned Fixer 1–5 stars with an optional written comment.
- Reviews are one-way (Requester → Fixer), one per task, permanent, and bounded to a 14-day window.
- Aggregate rating + review count is shown on the Fixer's public profile and on every bid card.

**Fixer Trust System**
- Public Fixer profile with bio, avatar, specializations, payment link (Bit/Paybox URL), portfolio (photo gallery with captions), aggregate rating, and review history.
- **Identity verification:** Fixers upload an ID photo + selfie; admins approve/reject. Approved Fixers get a verified badge.
- **Certifications:** Fixers upload professional documents tagged by category; admins approve/reject. Approved certs appear as trusted category badges on the profile.

**Admin & Moderation**
- Dedicated admin dashboard for: reviewing pending identity verifications, reviewing pending certifications, viewing reported reviews, hiding/dismissing reports, and managing users.
- Review reporting (with reason + optional details) is available to every user; one report per user per review.

**Internationalization**
- Full English (LTR) and Hebrew (RTL) support with a runtime language toggle (Welcome screen + Settings).
- All UI strings, error messages, and notifications are translated.
- Currency in ₪ in both languages. Language preference persists locally and to the user record.

### 2.2 Non-Functional Requirements

| Concern | How it's addressed |
|---|---|
| **Performance** | Geospatial "tasks near me" queries run at the database layer via PostgreSQL + PostGIS — no in-app coordinate math. Paginated chat history (30 messages per page), bid lists, and notification lists. |
| **Security** | Every protected REST and Socket.io endpoint verifies a Firebase ID token via `firebase-admin` before any business logic runs. No password hashing or refresh-token tables on the server. All mutation routes validated with Zod schemas. Profanity filter on user-submitted text. Admin routes gated by an `adminAuth` middleware. Exact task address hidden from the public until a bid is accepted. |
| **Reliability** | Bid acceptance, cancellation, and completion are wrapped in database transactions with re-check guards to prevent race conditions. Notifications are persisted **and** pushed (never silently dropped). |
| **Internationalization & RTL** | i18n via `react-i18next` (`en.json` / `he.json`); full RTL layout switch when Hebrew is active; bilingual geocoding. |
| **Accessibility** | Web accessibility controls (font scaling, contrast helpers) and onboarding nudges for incomplete profiles. |
| **Testing** | Jest + supertest on the backend (against a real Postgres), Jest + React Native Testing Library on the frontend. Target: ≥ 80 % overall coverage; near-100 % on the service layer. CI runs lint + typecheck + tests for both workspaces on every PR. |
| **Code Quality** | Strict TypeScript end-to-end. ESLint configured per workspace. Husky + lint-staged run ESLint + `tsc --noEmit` on staged files before every commit. |
| **Deployability** | Auto-deploy on push to `main`: backend → Railway (runs `prisma migrate deploy` and starts the API; PostGIS runs as a Railway service); frontend web → Vercel (`expo export --platform web`). The `main` branch is protected; changes land via PR with required CI checks. Mobile builds via EAS Build (Android APK / iOS). |

### 2.3 Environment Requirements

To run the project locally, the following are required:

| | |
|---|---|
| **Runtime** | Node.js ≥ 20, npm ≥ 9 |
| **Database** | PostgreSQL with the PostGIS extension (a `docker-compose.yml` is provided for a local instance) |
| **External services** | A Firebase project (Authentication, Storage, Admin SDK service account); a Google Maps API key (Maps JavaScript API for web, Maps SDK for Android for native) |
| **Mobile tooling** | Expo CLI; EAS CLI for cloud builds (no local Android SDK / Xcode required) |
| **Environment files** | `backend/.env` and `frontend/.env` — see each workspace's README for required keys |

Quick bring-up (full instructions in [`README.md → Local development`](../README.md#local-development)):

```bash
git clone https://github.com/GuyStein1/CSFinalProject.git
cd CSFinalProject
npm install
docker compose up -d
cd backend && npx prisma migrate dev && npx prisma db seed && cd ..
npm run dev:backend   # API on http://localhost:3000
npm run dev:frontend  # Expo — press W for web, I for iOS, A for Android
```

---

## 3. Key Features

A one-line tour of what the app does, grouped by user role.

**For Requesters**
- Guided multi-step task creation wizard with photos, category, budget, and a private/public location split.
- Comparison view of incoming bids with full Fixer profiles, ratings, and reviews accessible from each bid card.
- Pre-acceptance chat with any bidder — open a private chat from the bid card to ask follow-up questions before committing.
- One-tap accept that auto-rejects all other bids and reveals the exact address only to the winner.
- Confirm-payment + confirm-completion two-step closeout, then leave a 1–5 star review within 14 days.
- Reopen a canceled task without re-creating it from scratch.

**For Fixers**
- Map + list discovery feed of nearby open tasks, filterable by distance, category, and price.
- Bid with a price offer + pitch message; edit, withdraw, or reactivate while the bid is still pending.
- Reply to a Requester-initiated chat as soon as the bid is placed (no need to wait for acceptance).
- Build a trusted public profile: bio, specializations, photo portfolio, payment link, admin-approved identity verification and category certifications.
- Push notifications for new tasks, accepted bids, and incoming messages.

**For Both Roles**
- Single unified account with one-tap switch between Requester and Fixer mode.
- Real-time per-task chat with read receipts and offline push fallback.
- In-app Notification Center plus push delivery for every key event.
- Full bilingual support (English LTR / Hebrew RTL) toggleable at any time; preference syncs across devices.
- Web + iOS + Android from a single codebase.
- Account settings: change phone, password reset, toggle notifications, delete account.

**For Admins**
- Dashboard for reviewing pending identity verifications and certifications (approve / reject with reason).
- Moderation queue for reported reviews (hide or dismiss).
- User management.

---

## 4. Architecture

### 4.1 High-Level Diagram

```
        Client (Expo — iOS / Android / Web)
   ┌──────────────────────────────────────────┐
   │  Firebase Auth SDK  →  obtains ID tokens  │
   │  Axios / React Query →  REST API           │
   │  Socket.io client    →  real-time chat     │
   └──────────────────────────────────────────┘
                      │  (Firebase ID token on every request)
                      ▼
        Backend (Node.js + Express)
   ┌──────────────────────────────────────────┐
   │  Auth middleware  →  verifies tokens (Admin SDK)  │
   │  REST routes      →  Prisma → PostgreSQL + PostGIS│
   │  Socket.io server →  per-task chat rooms          │
   │  Notification svc →  Expo push + persisted rows   │
   └──────────────────────────────────────────┘
                      │
                      ▼
        Data + External Services
   ┌──────────────────────────────────────────┐
   │  PostgreSQL + PostGIS (relational + geo) │
   │  Firebase Storage (direct client upload)  │
   │  Google Maps API (geocoding, distance)    │
   │  Expo Push Service (mobile push)          │
   └──────────────────────────────────────────┘
```

### 4.2 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React Native + Expo (iOS / Android / Web), TypeScript |
| **Backend** | Node.js + Express, TypeScript |
| **Database** | PostgreSQL + PostGIS (geospatial queries) |
| **ORM** | Prisma |
| **Auth** | Firebase Authentication (client SDK + Admin SDK) |
| **Real-time** | Socket.io (per-task chat rooms) |
| **Push** | Expo Push Service |
| **Storage** | Firebase Storage (direct client upload) |
| **Maps** | Google Maps API (Maps JS for web, Maps SDK for Android) |
| **i18n** | English (LTR) + Hebrew (RTL) via `react-i18next` |
| **Hosting** | Railway (API + PostGIS) · Vercel (web) · EAS Build (mobile) |
| **CI / Tooling** | GitHub Actions · ESLint · Jest + supertest · Husky + lint-staged · strict TypeScript |

### 4.3 Key Design Decisions

- **Monorepo with npm workspaces** — `backend/` and `frontend/` live in one repo, share CI, and can share types in the future. Tooling (husky, lint-staged, Prettier) runs uniformly across both.
- **Modular monolith on the backend** — the API is deployed as one process but the code is split into feature modules (auth, tasks, bids, messages, users, admin). This keeps operational complexity low for a project of this size while leaving a clean extraction path if any module ever needs to scale independently.
- **3-Layer architecture** — Controllers (Express route handlers) → Service / domain layer (business rules) → Repository layer (Prisma data access). Each layer is independently testable; HTTP concerns and persistence concerns never leak into business logic.
- **API-first** — the same REST + Socket.io surface serves the React Native mobile clients and the Expo Web client, guaranteeing feature parity from day one.
- **Firebase Auth as the identity provider** — no password hashing, no refresh-token tables, no custom JWT logic on the backend. The server only verifies tokens; the client SDK handles login, registration, email verification, and silent token refresh.
- **Direct-to-Storage media uploads** — the client uploads photos/certifications directly to Firebase Storage and only sends the resulting URL to the backend. This keeps large binary payloads off the Node process entirely.
- **Geospatial work at the DB layer** — PostGIS columns and `ST_DWithin` queries power "tasks within X km of me" without any application-side distance math.
- **Zod validation at every mutation boundary** — request bodies are validated before reaching the controller; the schemas are centralized in `backend/src/schemas.ts`.
- **`AppError` hierarchy + unified error middleware** — routes throw typed errors (`NotFoundError`, `ForbiddenError`, `ValidationError`, `ConflictError`, …) instead of hand-rolling status codes. The error handler turns them into `{ error: { code, message, details } }` consistently.
- **Persisted notifications + push delivery** — every push-worthy event also writes a row to the `Notification` table via `notificationService.sendNotification(...)`, so the in-app Notification Center stays consistent with what was pushed and never silently drops events.
- **Code is the source of truth** — the `docs/` folder began as up-front design specs and is kept as a living reference; where a spec and the code disagree, the code wins.

---

## 5. Where to Go from Here

For the full design specs — database schema, complete REST + Socket.io API, screen-by-screen UI layouts, detailed user flows, and the testing guide — see the documentation index at [`docs/README.md`](README.md). The same content is also browsable as a Docsify site via `docs/index.html`.
