# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This repository is in the **Planning/Design Phase** — no source code exists yet. It serves as the "Source of Truth" for architecture, database schema, and development roadmap for **Fixlt**, a location-based task marketplace connecting Requesters (users needing small tasks) with Fixers (handy individuals/professionals).

All future code must strictly adhere to the schemas and API designs defined in `docs/`.

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
- **Push Notifications**: Firebase Cloud Messaging (FCM)
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
  └─ FCM → push notifications
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
4. Real-Time Features (Socket.io chat, FCM push notifications, review UI)
5. Planned Additions (Hebrew/RTL i18n, task reopen, read receipts)
6. Polish & Demo (seed data, deployment, integration testing)

Team: Stein, Zilber, Shick. See `07_Development_Plan.md` for full task breakdown per member.
