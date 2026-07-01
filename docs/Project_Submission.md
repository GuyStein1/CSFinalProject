# FixIt — Project Submission

**A location-based task marketplace that connects people who need small jobs done with skilled locals who get them done.**

**Team:** Guy Stein · Guy Zilber · Guy Shick

---

## 1. Repository & Live Demo

| | |
|---|---|
| **Source code** | <https://github.com/GuyStein1/CSFinalProject> |
| **Live web app** | <https://fixit-one-mocha.vercel.app> |
| **Demo accounts** | See [README.md → Try it now](../README.md#try-it-now), which links to [`docs/Demo_Users.md`](Demo_Users.md) — pre-populated Requester, Fixer, and Admin accounts already wired with tasks, bids, chats, notifications, and reviews. |
| **Shared demo password** | `guyguyguy` |
| **Example open tasks on the map** | **Tel Aviv** — in Fixer mode, search "Tel Aviv" in the discovery map. |
| **Guided walkthrough** | See [`docs/Demo_Walkthrough.md`](Demo_Walkthrough.md) for a step-by-step demo script. |

No registration required — sign in with any demo account and the app is immediately populated.

---

## 2. System Requirements

### 2.1 Functional Requirements

What the system must do, grouped by capability.

**Authentication & Account Management**
- Email + password registration (Firebase Auth) or Google sign-in; email verification and password reset built in.
- Single unified account with two roles — **Requester** and **Fixer** — switchable from the top bar.
- Profile edit, phone update, language toggle, idle auto-logout, and account deletion.

**Task Creation & Discovery**
- Guided multi-step wizard: title, description, up to 5 photos, category (9 options), budget (fixed or "quote required"), and a public discovery pin + private exact address.
- Requesters can edit any field of an `OPEN` task.
- Fixers discover tasks on a Google Map or list view, filterable by distance, category, and price.
- 15-bid cap per task.

**Bidding System**
- One bid per Fixer per task (DB unique constraint), each with a price offer + pitch.
- Fixers can edit, withdraw, and reactivate their own `PENDING` bid.
- Accepting one bid moves the task to `IN_PROGRESS`, reveals the exact address, and auto-rejects all other pending bids.
- `cancel-accepted` returns the task to `OPEN` if the accepted Fixer backs out.

**Task Lifecycle**
- State machine: `OPEN → IN_PROGRESS → COMPLETED`, plus `CANCELED` and `CANCELED → OPEN` (reopen).
- Completion is **payment-first and two-sided**: Requester confirms payment (external Bit/Paybox deep-link), both parties confirm completion, then the task flips to `COMPLETED`.
- 14-day review window on completion.

**Real-Time Chat**
- Socket.io per-task rooms with REST fallback for history.
- Requester can chat with any Fixer who has a `PENDING` or `ACCEPTED` bid (Requester-initiated only).
- Read receipts, offline push fallback, read-only on `COMPLETED` / `CANCELED`.

**Notifications**
- Expo Push for bid received, bid accepted/rejected, new message (offline), task completed, certification/verification reviewed.
- In-app Notification Center with unread counts; each item deep-links to the relevant screen.

**Reviews & Reputation**
- Requester rates the assigned Fixer 1–5 stars with an optional comment; one per task, permanent, 14-day window.
- Aggregate rating + review count on Fixer profiles and bid cards.

**Fixer Trust System**
- Public profile with bio, specializations, payment link, photo portfolio, aggregate rating.
- Admin-reviewed **identity verification** (ID + selfie) and **category certifications** (uploaded documents).

**Admin & Moderation**
- Dashboard for pending verifications, pending certifications, reported reviews (hide/dismiss), and user management.

**Internationalization**
- English (LTR) + Hebrew (RTL) with runtime toggle; all strings translated; preference persisted per user.

> **See also:** Full feature spec — [`docs/01_Product_Overview.md`](01_Product_Overview.md); full REST + Socket.io surface — [`docs/04_API_Design.md`](04_API_Design.md); user flows — [`docs/05_User_Flows.md`](05_User_Flows.md).

### 2.2 Non-Functional Requirements

| Concern | How it's addressed |
|---|---|
| **Performance** | PostGIS handles "tasks near me" at the DB layer (`ST_DWithin`, no in-app coordinate math). Paginated chat, bids, and notifications. |
| **Security** | Every protected REST + Socket.io request verifies a Firebase ID token via `firebase-admin` before any business logic runs. All mutation routes validated with Zod. Profanity filter on user text. Admin routes gated by `adminAuth`. Exact task address hidden until acceptance. |
| **Reliability** | Bid acceptance, cancellation, and completion wrapped in DB transactions with re-check guards. Notifications are both persisted and pushed. |
| **i18n & RTL** | `react-i18next` with `en.json` / `he.json`; full RTL layout switch; bilingual geocoding. |
| **Accessibility** | Web accessibility controls (font scaling, contrast helpers). |
| **Testing** | Target ≥ 80% coverage. CI runs lint + typecheck + tests on both workspaces per PR; husky + lint-staged run ESLint + `tsc --noEmit` on pre-commit. |
| **Code Quality** | Strict TypeScript throughout; ESLint per workspace. |
| **Deployability** | Auto-deploy on push to `main` (Railway + Vercel). Mobile builds via EAS Build. Protected `main` branch. |

> **See also:** Full testing strategy — [`docs/09_Testing_Guide.md`](09_Testing_Guide.md).

### 2.3 Environment Requirements

- Node.js ≥ 20, npm ≥ 9
- PostgreSQL with PostGIS extension (docker-compose provided)
- A Firebase project (Authentication + Storage + Admin SDK service account)
- A Google Maps API key (Maps JS for web, Maps SDK for Android for native)
- Expo CLI; EAS CLI for cloud mobile builds
- `backend/.env` and `frontend/.env` (see each workspace's README for required keys)

> **See also:** exact bring-up commands — [README.md → Local development](../README.md#local-development).

---

## 3. Key Features

> **See also:** [`docs/01_Product_Overview.md`](01_Product_Overview.md) — full breakdown with rationale and phase labels.

**For Requesters**
- Guided task-creation wizard with photos, category, budget, and public/private location split.
- Bid comparison view with fixer profiles, ratings, and reviews.
- Pre-acceptance chat with any bidder.
- One-tap accept auto-rejects other bids and reveals the exact address only to the winner.
- Confirm-payment → confirm-completion → leave a 1–5 star review.
- Reopen canceled tasks without re-creating.

**For Fixers**
- Map + list discovery feed filterable by distance, category, price.
- Bid with price + pitch; edit / withdraw / reactivate while pending.
- Reply in a Requester-initiated chat as soon as the bid is placed.
- Trusted public profile: portfolio, admin-approved identity verification and category certifications.
- Push notifications for new tasks, accepted bids, incoming messages.

**For Both Roles**
- Unified account, one-tap Requester / Fixer switch.
- Real-time per-task chat with read receipts and offline push.
- In-app Notification Center.
- Full English / Hebrew with RTL toggle.
- Web + iOS + Android from one codebase.

**For Admins**
- Approve/reject identity verifications and category certifications.
- Moderate reported reviews (hide / dismiss).
- Manage users.

---

## 4. Architecture

### 4.1 High-Level Diagram

```
Client (Expo — iOS / Android / Web)
    │  Firebase Auth (ID token on every request)
    ▼
Backend (Node.js + Express)  ──►  PostgreSQL + PostGIS
    │                              (relational + geo)
    ├──► Socket.io (per-task chat rooms)
    ├──► Expo Push Service (mobile push)
    └──► Firebase Storage (direct client upload; only URLs stored in Postgres)
```

> **See also:** Full architecture write-up with layer-by-layer walkthrough — [`docs/02_System_Architecture.md`](02_System_Architecture.md).

### 4.2 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React Native + Expo (iOS / Android / Web), TypeScript |
| **Backend** | Node.js + Express, TypeScript |
| **Database** | PostgreSQL + PostGIS, Prisma ORM |
| **Auth** | Firebase Authentication (client SDK + Admin SDK) |
| **Real-time / Push / Storage / Maps** | Socket.io · Expo Push · Firebase Storage · Google Maps API |
| **Hosting** | Railway (API + PostGIS) · Vercel (web) · EAS Build (mobile) |
| **Tooling** | GitHub Actions · ESLint · Jest + supertest · Husky + lint-staged · strict TypeScript |

> **See also:** Full stack table — [README.md → Tech stack](../README.md#tech-stack).

### 4.3 Key Design Decisions

- **Monorepo with npm workspaces** — `backend/` and `frontend/` share CI and can share types; uniform tooling (husky, lint-staged, Prettier).
- **Modular monolith on the backend** — deployed as one process but split into feature modules (auth, tasks, bids, messages, users, admin). Low operational complexity with a clean extraction path.
- **3-Layer architecture** — Controllers (Express handlers) → Service / domain layer → Repository (Prisma). HTTP concerns and persistence never leak into business logic.
- **API-first** — one REST + Socket.io surface serves mobile and web, guaranteeing feature parity from day one.
- **Firebase Auth as identity provider** — no password hashing, no refresh-token tables, no custom JWT on the backend. The server only verifies tokens.
- **Direct-to-Storage media uploads** — the client uploads to Firebase Storage and sends only the URL to the backend, keeping binaries off the Node process.
- **Geospatial work at the DB layer** — PostGIS columns + `ST_DWithin` power "tasks within X km" with no application-side distance math.
- **Zod validation at every mutation boundary** — schemas centralized in `backend/src/schemas.ts`; malformed requests never reach the service layer.
- **`AppError` hierarchy + unified error middleware** — routes throw typed errors; the handler formats them into `{ error: { code, message, details } }` consistently.
- **Persisted + pushed notifications** — every push-worthy event writes a `Notification` row via `notificationService.sendNotification(...)`, keeping the in-app center consistent with what was pushed.
- **Code is the source of truth** — the `docs/` folder is a living reference; where a spec and the code disagree, the code wins.

---

## 5. Where to Go from Here

For the full design specs — database schema, complete REST + Socket.io API, screen-by-screen UI layouts, detailed user flows, testing strategy, and deployment guide — see the documentation index at [`docs/README.md`](README.md). The same content is browsable as a Docsify site via `docs/index.html`.
