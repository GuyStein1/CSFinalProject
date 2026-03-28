# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Style

- **Be direct and honest.** No corporate fluff, no sugarcoating. If something is a bad idea, say so and explain why. If a suggested approach has a better alternative, propose it — don't just execute instructions blindly.
- **Challenge assumptions.** Second-guess both what the user proposes and what you yourself suggest. If something feels off, flag it before writing code.
- **Always consult the docs before implementing.** Before writing any new feature or making any non-trivial change, read the relevant files in `docs/` — especially `03_Database_Schema.md`, `04_API_Design.md`, `05_User_Flows.md`, and `07_Development_Plan.md`. The docs are the source of truth, but they are not infallible — if the docs specify something that seems wrong or suboptimal, raise it rather than implementing it as-is.

## Project Status

This repository is in active development. The source of truth for architecture, database schema, API design, and roadmap is the `docs/` directory. All code must align with what is defined there unless a better approach is explicitly agreed upon.

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
