# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Style

- **Be direct and honest.** No corporate fluff, no sugarcoating. If something is a bad idea, say so and explain why. If a suggested approach has a better alternative, propose it — don't just execute instructions blindly.
- **Challenge assumptions.** Second-guess both what the user proposes and what you yourself suggest. If something feels off, flag it before writing code.
- **Always consult the docs before implementing.** Before writing any new feature or making any non-trivial change, read the relevant files in `docs/` — especially `03_Database_Schema.md`, `04_API_Design.md`, `05_User_Flows.md`, and `07_Development_Plan.md`. The docs are the source of truth, but they are not infallible — if the docs specify something that seems wrong or suboptimal, raise it rather than implementing it as-is.

> **Project status is fluid — don't hardcode it here.** The work is organized into phases (see below), but which phase is active and what's done changes constantly. To learn the current state, read recent `git log` on `main`, open PRs, and the GitHub project board — not this file.

## Repository Layout

npm workspaces monorepo. Two workspaces plus shared docs:

```
backend/    Node + Express + TypeScript API (Prisma → PostgreSQL/PostGIS)
frontend/   React Native + Expo app (iOS / Android / web), TypeScript
docs/       Source-of-truth specs (Docsify site) — see Documentation Index below
```

Run any workspace script from the repo root with `--workspace`, e.g. `npm run dev --workspace backend`. Note that workspace-local CLIs (like `prisma`) live in that workspace's `node_modules/.bin`, so run them from inside the workspace dir (`cd backend && npx prisma ...`) or via `npm exec -w backend -- prisma ...`.

### Backend (`backend/src/`)
- `index.ts` / `app.ts` — Express entry point + app wiring; routes mounted under `/api`
- `routes/` — one file per domain: `auth.ts`, `tasks.ts` (tasks + bids-on-task + reviews), `bids.ts`, `users.ts`, `messages.ts`, `admin.ts`
- `middleware/` — `auth.ts` (Firebase token verification + user lookup → `req.user`), `adminAuth.ts`, `validate.ts` (Zod), `errorHandler.ts`
- `config/` — `prisma.ts` (Prisma singleton), `firebaseAdmin.ts` (init; gracefully skips if env vars missing)
- `services/notificationService.ts` — `sendNotification(userId, title, body, type, relatedEntityId, relatedEntityType)`: persists a `Notification` row + sends Expo push if a token exists; never throws
- `socket/index.ts` — Socket.io chat server (one room per task; read receipts)
- `utils/` — `errors.ts` (AppError hierarchy), `profanityFilter.ts`, `ratingCalculator.ts`
- `schemas.ts` — centralized Zod schemas for mutation endpoints
- `prisma/` — `schema.prisma`, `migrations/`, `seed.ts`

### Frontend (`frontend/src/`)
- `screens/` — one file per screen; `*.web.tsx` variants where web diverges from native
- `navigation/` — root/app/auth navigators, requester vs fixer tab configs, mode toggle
- `components/` — shared UI; `components/ui/` holds the `F*` design-system primitives (`FButton`, `FCard`, `FInput`, `FSectionHeader`, …)
- `hooks/`, `context/`, `api/` (`axiosInstance.ts` auto-attaches the Firebase token), `utils/`, `theme.ts`

## Conventions

- **TypeScript everywhere**, strict mode. Keep `tsc --noEmit` clean — CI runs lint + typecheck on both workspaces, and a pre-commit hook (husky + lint-staged) runs ESLint + typecheck on staged files.
- **Errors:** throw the `AppError` subclasses (`NotFoundError`, `ForbiddenError`, `ValidationError`, `ConflictError`, …); the error handler turns them into `{ error: { code, message, details } }`. Don't hand-roll status codes in routes.
- **Validation:** every mutation route uses `validate(<zodSchema>)` from `middleware/validate.ts`, with the schema defined in `schemas.ts`.
- **Notifications:** trigger user-facing events via `sendNotification(...)` rather than writing `Notification` rows directly.
- **Frontend UI:** prefer the `F*` primitives in `components/ui/` over raw Paper/RN components for new screens. Status chips go through `StatusBadge`.
- **Platform-aware dialogs:** confirmations use `confirm()` on web and `Alert.alert(...)` on native (see existing screens for the pattern).
- **i18n note:** much UI text is currently hardcoded English; a full i18n/RTL pass is planned. Check whether i18n has landed before assuming either way.

## Testing

- **Backend:** Jest + supertest in `backend/src/__tests__/`. Firebase UID is mocked via `__setUid`, and `cleanDatabase()` runs between tests against a real Postgres. Run: `npm test --workspace backend`.
- **Frontend:** Jest in `frontend/src/**/__tests__/`. Run: `npm test --workspace frontend`.
- Coverage target ≥80% on both. Mirror the existing test in a file when adding new ones.

The source of truth for architecture, database schema, API design, and roadmap is the `docs/` directory. All code must align with what is defined there unless a better approach is explicitly agreed upon.

## Documentation Index

The `docs/` directory is the primary reference:

| File | Contents |
|------|----------|
| `01_Product_Overview.md` | Problem/solution, user personas, feature tiers (Phase 1 / Planned / Stretch Goal) |
| `02_System_Architecture.md` | Full tech stack, system flow, project scope & constraints |
| `03_Database_Schema.md` | Entity definitions, Prisma enums, ER diagram |
| `04_API_Design.md` | RESTful endpoints and Socket.io event structures |
| `05_User_Flows.md` | Task creation, bidding, and completion flows |
| `06_Screen_Layouts.md` | Mobile and web UI/UX specifications |
| `07_Development_Plan.md` | Detailed team task assignments across all phases |
| `08_Firebase_Integration_Guide.md` | Firebase Admin (backend) and Client SDK (frontend) setup |

The docs site is powered by Docsify (`docs/index.html`) and can be served locally.

## Planned Tech Stack

- **Frontend**: React Native (Expo) for iOS/Android, React.js (or Expo Web) for web — TypeScript throughout
- **Backend**: Node.js + Express (TypeScript)
- **Database**: PostgreSQL with PostGIS extension (geospatial queries)
- **ORM**: Prisma
- **Auth**: Firebase Authentication (client SDK + Firebase Admin SDK on server to verify tokens)
- **Real-time**: Socket.io for in-app chat
- **Push Notifications**: Expo Push Service for the initial mobile MVP
- **Storage**: Firebase Storage (client uploads directly; backend receives URLs)
- **Maps**: Google Maps API (geocoding, distance, display)
- **i18n**: English (LTR) + Hebrew (RTL) — bilingual support is a core requirement

## Architecture Overview

```
Client (Expo / React.js)
  └─ Firebase Auth SDK → obtains ID tokens
  └─ REST API calls (Axios/React Query) → Node.js/Express backend
  └─ Socket.io client → real-time chat

Backend (Node.js/Express)
  └─ Auth Middleware → verifies Firebase ID tokens via Firebase Admin SDK
  └─ REST endpoints → Prisma → PostgreSQL + PostGIS
  └─ Socket.io server → per-task chat rooms (namespace: task_chat_{taskId})
 └─ Notification service → mobile push notifications
```

**Auth flow**: Firebase handles registration/login on the client. After registration, the client calls `POST /api/auth/sync` to create a local `User` record in PostgreSQL.

**Location privacy**: Tasks expose only a public pin for discovery; exact address is hidden until a bid is accepted.

**Bidding state machine**: `OPEN → IN_PROGRESS → COMPLETED`. Accepting one bid auto-rejects all others.

**Payments**: External deep-links only (Bit/Paybox URLs) — no in-app payment processing. Requester can optionally confirm payment was sent via a separate flag (`is_payment_confirmed`).

## Core Entities

`User` · `Task` · `Bid` · `Review` · `Message` · `Notification` · `PortfolioItem` · `Certification`

Users have a single unified account with both Requester and Fixer roles.

## Development Phases Summary

1. Foundation & Setup (monorepo, PostgreSQL+PostGIS, Prisma, Firebase project, Expo scaffold, GitHub Actions CI)
2. Backend Core (auth middleware, all API endpoints, notification service, input validation)
3. Frontend Core (all screens mobile + web, navigation, API integration)
4. Real-Time Features (Socket.io chat, mobile push notifications, review UI)
5. Planned Additions (Hebrew/RTL i18n, task reopen, read receipts)
6. Polish & Demo (seed data, deployment, integration testing)

Team: Stein, Zilber, Shick. See `07_Development_Plan.md` for full task breakdown per member.
