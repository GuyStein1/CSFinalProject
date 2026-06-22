<div align="center">

# 🔧 FixIt

**A location-based task marketplace that connects people who need small jobs done with skilled locals who get them done.**

Post a task, receive competitive bids from nearby Fixers, chat, agree, and get it done — all in one app, on web and mobile.

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React%20Native-Expo-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-4169E1?logo=postgresql&logoColor=white)](https://postgis.net/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Firebase](https://img.shields.io/badge/Auth-Firebase-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)

**[🌐 Live Web App](https://fixit-one-mocha.vercel.app)** · **[👤 Demo Accounts](docs/Demo_Users.md)** · **[📚 Documentation](docs/README.md)**

</div>

---

## Try it now

The fastest way to see FixIt is to sign in with a pre-populated demo account — no registration needed.

1. Open **[fixit-one-mocha.vercel.app](https://fixit-one-mocha.vercel.app)**
2. Sign in with any account from **[the demo accounts list](docs/Demo_Users.md)** (password: `guyguyguy`)
3. Each account already has tasks, bids, chats, notifications, and reviews so the app feels alive immediately.

Every account is unified — switch between **Requester** and **Fixer** mode from the top bar at any time.

---

## What it does

Finding reliable help for small everyday jobs — assembling furniture, mounting a TV, fixing a
leaking pipe, painting a room — is high-friction. Contractors won't take micro-gigs, and the
common alternative (WhatsApp/Facebook groups) is unstructured and leaves both sides with no
accountability. FixIt replaces that with a structured, transparent bidding marketplace.

| For Requesters | For Fixers |
|---|---|
| Post a task with photos, budget, and location through a guided wizard | Discover nearby tasks on a map and list, filtered by category and distance |
| Receive competitive bids and compare Fixer profiles, ratings, and reviews | Submit bids with a price and message; build a trusted profile |
| Accept the best offer — all other bids auto-reject | Earn verification badges, certifications, and a portfolio |
| Chat in real time, confirm completion, leave a review | Get push notifications for new tasks, accepted bids, and messages |

### Feature highlights

- 🔐 **Firebase authentication** — email/password + Google sign-in, email verification, password reset, idle auto-logout
- 📝 **Guided task creation** — multi-step wizard with photo uploads, category, budget, and map location
- 🗺️ **Geospatial discovery** — PostGIS-powered "tasks near me" with distance sorting, map + list views
- 💰 **Transparent bidding** — `OPEN → IN_PROGRESS → COMPLETED` state machine; accepting one bid auto-rejects the rest
- ⭐ **Trust system** — Fixer verification, admin-reviewed certifications, portfolios, and post-completion reviews
- 💬 **Real-time chat** — Socket.io per-task rooms with read receipts; location revealed only after a bid is accepted
- 🔔 **Notifications** — Expo push + an in-app notification center
- 🛡️ **Admin & moderation** — certification review, reports handling, user management, profanity filtering
- 🌍 **Bilingual** — full English (LTR) and Hebrew (RTL) support
- ♿ **Accessibility** — web accessibility controls and onboarding nudges

---

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | React Native + Expo (iOS / Android / Web), TypeScript |
| **Backend** | Node.js + Express, TypeScript |
| **Database** | PostgreSQL + PostGIS (geospatial queries) |
| **ORM** | Prisma |
| **Auth** | Firebase Authentication |
| **Real-time** | Socket.io (per-task chat) |
| **Push** | Expo Push Service |
| **Storage** | Firebase Storage (direct client upload) |
| **Maps** | Google Maps API (geocoding, distance, display) |
| **i18n** | English (LTR) + Hebrew (RTL) |
| **Hosting** | Railway (API + PostGIS) · Vercel (web) |

---

## Architecture

```
        Client (Expo — iOS / Android / Web)
   ┌──────────────────────────────────────────┐
   │  Firebase Auth SDK  →  obtains ID tokens   │
   │  Axios / React Query →  REST API            │
   │  Socket.io client    →  real-time chat      │
   └──────────────────────────────────────────┘
                      │  (Firebase ID token on every request)
                      ▼
        Backend (Node.js + Express)
   ┌──────────────────────────────────────────┐
   │  Auth middleware  →  verifies tokens (Admin SDK) │
   │  REST routes      →  Prisma → PostgreSQL + PostGIS│
   │  Socket.io server →  per-task chat rooms          │
   │  Notification svc →  Expo push + persisted rows   │
   └──────────────────────────────────────────┘
```

- **Auth flow:** Firebase handles registration/login on the client; after registration the client calls `POST /api/auth/sync` to create the local `User` record.
- **Location privacy:** tasks expose only a public discovery pin; the exact address is hidden until a bid is accepted.
- **Payments:** external deep-links only (Bit / Paybox) — no in-app payment processing.

For the full picture, see the [documentation](docs/README.md) — schema, API design, and user flows.

---

## Project structure

```
CSFinalProject/
├── backend/          Node.js + Express API
│   ├── src/
│   │   ├── routes/       One file per domain (tasks, bids, users, auth, messages, admin…)
│   │   ├── middleware/   Auth, admin auth, Zod validation, error handling
│   │   ├── services/     notificationService (push + persisted notifications)
│   │   ├── socket/       Socket.io chat server
│   │   ├── utils/        Errors, profanity filter, rating calculator…
│   │   └── config/       Prisma + Firebase Admin init
│   └── prisma/           schema.prisma + migrations + seed.ts
├── frontend/         React Native + Expo app
│   └── src/
│       ├── screens/      One file per screen (.web.tsx variants where web diverges)
│       ├── navigation/   Root / app / auth navigators, requester vs fixer tabs
│       ├── components/   Shared UI + the F* design-system primitives (components/ui/)
│       ├── hooks/ context/ api/ utils/
│       └── i18n/         en.json + he.json
└── docs/             Design specs and architecture documentation
```

Each workspace has its own README with detailed scripts: **[backend/README.md](backend/README.md)** · **[frontend/README.md](frontend/README.md)**.

---

## Local development

### Prerequisites

- Node.js ≥ 20, npm ≥ 9
- PostgreSQL with PostGIS (Docker `docker-compose.yml` provided for local DB)
- A Firebase project (config lives in `.env` files — ask a teammate for secrets)

### Quick start

```bash
# 1. Clone and install (npm workspaces monorepo)
git clone https://github.com/GuyStein1/CSFinalProject.git
cd CSFinalProject
npm install

# 2. Add env files (never committed) — see backend/README.md & frontend/README.md
#    backend/.env   and   frontend/.env

# 3. Start the local database + run migrations
docker compose up -d
cd backend && npx prisma migrate dev && npx prisma db seed && cd ..

# 4. Run the apps (two terminals)
npm run dev:backend     # API on http://localhost:3000
npm run dev:frontend    # Expo — press W (web), I (iOS), A (Android)
```

### Testing

```bash
npm test --workspace backend     # Jest + supertest against a real Postgres
npm test --workspace frontend    # Jest + React Native Testing Library
```

CI (GitHub Actions) runs lint + typecheck + tests on both workspaces for every PR, and a
pre-commit hook runs ESLint + typecheck on staged files.

---

## Deployment

Every push to `main` automatically redeploys:

- **Backend → Railway** — runs `prisma migrate deploy`, then starts the API (PostGIS runs as a Railway service)
- **Frontend → Vercel** — runs `expo export --platform web` and serves the static build

The `main` branch is protected: changes land via PR, and both backend and frontend CI checks
must pass before merging.

---

## Documentation

| Doc | Contents |
|---|---|
| [Product Overview](docs/01_Product_Overview.md) | Problem, solution, personas, full feature breakdown |
| [System Architecture](docs/02_System_Architecture.md) | Tech stack, system flow, scope & constraints |
| [Database Schema](docs/03_Database_Schema.md) | Entities, enums, ER diagram |
| [API Design](docs/04_API_Design.md) | REST endpoints and Socket.io events |
| [User Flows](docs/05_User_Flows.md) | Task creation, bidding, completion journeys |
| [Screen Layouts](docs/06_Screen_Layouts.md) | Mobile and web UI/UX specs |
| [Demo Accounts](docs/Demo_Users.md) | Ready-to-use logins for exploring the app |
| [Testing Guide](docs/09_Testing_Guide.md) | Test strategy and coverage |

> The `docs/` folder began as up-front design specs and is kept as a living reference. Where a
> spec and the code disagree, **the code is the source of truth.**

---

## Team

Built by **Guy Stein**, **Guy Zilber**, and **Guy Shick**.
