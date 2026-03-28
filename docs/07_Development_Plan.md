# Development Plan

This document defines the full development plan across 6 phases, with tasks assigned per team member. Phase 1 tasks are fully specified (exact files, commands, and configs). Subsequent phases list ownership and task scope — they will be detailed further as each phase approaches.

---

## Phase Overview

| Phase | Name | Focus |
|---|---|---|
| 1 | Foundation & Setup | Repository, database, Firebase project, frontend scaffold, CI |
| 2 | Backend Core | All API endpoints, auth middleware, notification service, validation |
| 3 | Frontend Core | All screens (mobile + web), navigation, API integration |
| 4 | Real-Time Features | Socket.io chat, push notifications, review UI |
| 5 | Planned Additions | Hebrew/i18n, task reopen, read receipts, account deletion |
| 6 | Polish & Demo | Seed data, deployment, integration testing |

---

## Dependency Overview

Some tasks across members create hard blockers. These must be prioritized:

| Task | Blocks | Owner |
|---|---|---|
| Firebase project setup (Z1.1) | Auth middleware can't be tested; `.env.example` incomplete | Zilber |
| Prisma schema + migration (S1.4) | All backend endpoints; seed script | Stein |
| Axios interceptor (Z1.3) | Every frontend API call | Zilber |
| `authMiddleware` (Phase 2) | All protected API endpoints | Stein |
| `notificationService` (Phase 2) | Push triggers in bid/task endpoints | Zilber |
| Reusable UI components (Phase 3, early) | All other frontend screens | Shick |
| Socket.io server (Phase 4) | Chat UI | Stein |

---

## Phase 1 — Foundation & Setup

Goal: All three members have a working local development environment, the database is defined and migrated, the Firebase project exists, the frontend project is scaffolded, and CI is running.

---

### Stein — Phase 1

#### A1.1 — Repository & Monorepo Setup

A monorepo keeps backend and frontend in one GitHub repository so the whole team works in one place with shared tooling. The team works directly from short-lived feature branches off `main`, and `main` stays stable through reviewed PRs.

- Use the existing Git repository as the monorepo root.
- Scaffold a monorepo structure with two top-level directories: `/backend` and `/frontend`.
- Root-level `package.json` with npm workspaces pointing to both directories, plus a single root `package-lock.json` shared by the whole repo.
- Root-level `.gitignore`:
  ```
  node_modules/
  dist/
  .env
  .expo/
  firebase-service-account.json
  *.js.map
  ```
- Branch strategy: each team member creates a feature branch off `main` for each task (e.g. `feature/prisma-schema`), then opens a PR to merge back into `main` when done.

#### A1.2 — Backend Project Initialization

Sets up the Node.js/Express/TypeScript project skeleton — installs all dependencies, configures the TypeScript compiler, and creates the entry point so the server can actually run locally. Also establishes the folder structure all backend code will follow.

- Initialize the Node.js/TypeScript project in `/backend`:
  ```bash
  npm init -y -w backend
  npm install -w backend express cors helmet morgan dotenv
  npm install -D -w backend typescript ts-node nodemon @types/express @types/node @types/cors @types/morgan eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin
  ```
- `backend/tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs",
      "lib": ["ES2020"],
      "outDir": "./dist",
      "rootDir": "./src",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "resolveJsonModule": true
    },
    "include": ["src/**/*", "prisma/seed.ts"],
    "exclude": ["node_modules", "dist"]
  }
  ```
- `backend/nodemon.json`:
  ```json
  { "watch": ["src"], "ext": "ts", "exec": "ts-node src/index.ts" }
  ```
- `backend/package.json` scripts:
  ```json
  "scripts": {
    "dev": "nodemon",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit"
  }
  ```
- `backend/eslint.config.js` (or equivalent ESLint config) and root `.prettierrc` / `.prettierignore`:
  - Keep the initial rules minimal so CI is reliable from day one.
  - Ignore `dist`, `node_modules`, and generated files.
- Folder structure under `backend/src/`:
  ```
  backend/src/
  ├── config/          (Firebase Admin, env validation)
  ├── middleware/      (authMiddleware, errorHandler, validate)
  ├── routes/          (one file per domain: auth, users, tasks, bids, reviews, notifications)
  ├── services/        (notificationService, etc.)
  └── utils/           (helpers)
  ```
- `backend/src/index.ts` — Express entry point:
  - Load dotenv
  - Initialize Express
  - Register global middleware: `cors`, `helmet`, `morgan`, `express.json()`
  - Import and mount route files under `/api`
  - Register error handler middleware (last)
  - `app.listen(PORT)`
- `GET /health` endpoint returning `{ status: "ok", timestamp: new Date().toISOString() }` — no auth required.

#### A1.3 — PostgreSQL + PostGIS Local Setup

Runs a PostgreSQL database locally using Docker, with the PostGIS extension that enables geographic queries (e.g. "find all tasks within 10 km"). Using Docker means every team member gets an identical database environment without installing PostgreSQL manually.

- `docker-compose.yml` at repo root:
  ```yaml
  version: "3.8"
  services:
    db:
      image: postgis/postgis:15-3.3
      ports:
        - "5432:5432"
      environment:
        POSTGRES_USER: fixlt
        POSTGRES_PASSWORD: fixlt
        POSTGRES_DB: fixlt_dev
      volumes:
        - pgdata:/var/lib/postgresql/data
  volumes:
    pgdata:
  ```
- Start DB locally: `docker compose up -d`
- `backend/.env` (not committed — see `.env.example`):
  ```
  DATABASE_URL="postgresql://fixlt:fixlt@localhost:5432/fixlt_dev"
  ```

#### A1.4 — Prisma Schema & Initial Migration

Translates the database design in `03_Database_Schema.md` into code. Prisma reads the schema file and generates TypeScript types, so every part of the backend that touches the database is type-safe. Migrations track schema changes over time so all team members can stay in sync.

- Install Prisma:
  ```bash
  npm install prisma @prisma/client
  npx prisma init
  ```
- `backend/prisma/schema.prisma` — define all enums and models exactly as specified in `docs/03_Database_Schema.md`:
  - Generator: `prisma-client-js`
  - Datasource: `postgresql` with `postgis` preview feature
  - **Enums:** `Category`, `TaskStatus`, `BidStatus`, `NotificationType`
  - **User model** with all fields; unique on `firebase_uid`, `email`, `phone_number`
  - **Task model** with `coordinates Unsupported("geometry(Point, 4326)")`, `completed_at`, and `@@index([coordinates], type: Gist)`
  - **Bid model** with `@@unique([task_id, fixer_id])`
  - **Review model** with `@@unique([task_id, reviewer_id])`
  - **Message, Notification, PortfolioItem** models
  - Certifications can be added later in a follow-up migration if that stretch-goal profile scope is picked up
- Run migration:
  ```bash
  npx prisma migrate dev --name init
  npx prisma generate
  ```
- Verify: `npx prisma studio` — confirms all tables exist with correct columns.

> **Dependency note:** The Prisma schema (A1.4) must be complete before Shick can finalize the seed script structure (C1.3), and before any backend endpoint work begins in Phase 2.

---

### Zilber — Phase 1

#### B1.1 — Firebase Project Setup

Creates the Firebase project that powers authentication and file storage for the app. This task produces the credentials files (API keys, service account) that both the backend and frontend need to connect to Firebase — so it unblocks the rest of the team.

- Go to [Firebase Console](https://console.firebase.google.com) → Create project: `fixlt-dev`.
- **Authentication:** Enable Email/Password sign-in provider.
- **Storage:** Enable Firebase Storage. Set initial security rules:
  ```
  rules_version = '2';
  service firebase.storage {
    match /b/{bucket}/o {
      match /{allPaths=**} {
        allow read: if true;
        allow write: if request.auth != null;
      }
    }
  }
  ```
- **Service Account Key:** Project Settings → Service Accounts → Generate new private key → download JSON. Save locally as `backend/firebase-service-account.json`. **Never commit this file.**
- **Web App Config:** Project Settings → General → Add Web App → copy the `firebaseConfig` object. This will be used in `frontend/.env`.
- Share all key values with the team via a secure channel (e.g., a shared password manager). Fill in `backend/.env.example` and `frontend/.env.example` (keys without values — structure only).
- **Push notification note:** For the initial mobile MVP, push delivery will use Expo push tokens via `expo-notifications`, not direct Firebase Cloud Messaging device tokens.

> **Dependency note:** B1.1 must be complete before Stein can test the `authMiddleware` (Phase 2) and before Shick can finalize the `.env.example` file (C1.2).

#### B1.2 — Frontend Expo Project Initialization

Scaffolds the React Native / Expo project with all packages installed and the folder structure organized. Expo is the framework that lets the same TypeScript code run on iOS, Android, and web. This task produces the working skeleton every frontend screen will be built inside.

- Scaffold the Expo project:
  ```bash
  npx create-expo-app frontend --template blank-typescript
  ```
- Install all dependencies:
  ```bash
  npm install -w frontend firebase @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs axios socket.io-client react-native-paper react-native-vector-icons
  npx expo install expo-notifications expo-device react-native-maps expo-image-picker expo-location react-native-safe-area-context react-native-screens
  npm install -D -w frontend eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
  ```
- Folder structure under `frontend/src/`:
  ```
  frontend/src/
  ├── screens/
  │   ├── auth/        (Login, Register, ForgotPassword)
  │   ├── requester/   (Dashboard, TaskCreate, TaskDetails)
  │   ├── fixer/       (Discovery, TaskDetailsFixer, MyBids)
  │   └── shared/      (Profile, Chat, Notifications, Settings, PublicProfile)
  ├── components/      (shared reusable UI)
  ├── navigation/      (RootNavigator, AuthStack, AppStack, tab configs)
  ├── hooks/           (useAuth, useTasks, useBids, etc.)
  ├── api/             (axiosInstance, endpoint functions per domain)
  ├── store/           (auth state, user state — via Context or Zustand)
  ├── utils/           (uploadImage, formatDate, formatPrice, etc.)
  ├── config/          (firebase.ts)
  └── assets/          (images, icons)
  ```
- `frontend/package.json` scripts:
  ```json
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "eslint src --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  }
  ```
- `frontend/eslint.config.js` (or equivalent ESLint config) mirroring the backend setup for consistency.

#### B1.3 — Firebase Client SDK Initialization & Axios Interceptor

Two closely related setup tasks. First: initialize Firebase in the frontend so users can sign in. Second: create a single shared HTTP client (Axios) that automatically attaches the logged-in user's Firebase auth token to every API request — so no individual screen has to handle authentication headers manually.

- `frontend/src/config/firebase.ts`:
  ```typescript
  import { initializeApp } from 'firebase/app';
  import { getAuth } from 'firebase/auth';

  const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };

  const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app);
  ```
- `frontend/src/api/axiosInstance.ts`:
  ```typescript
  import axios from 'axios';
  import { auth } from '../config/firebase';

  const api = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  });

  api.interceptors.request.use(async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  export default api;
  ```
- Verify TypeScript compiles cleanly: `npx tsc --noEmit`.

> **Dependency note:** B1.3 (Axios interceptor) must be complete before any frontend API calls can be made in Phase 3.

---

### Shick — Phase 1

#### C1.1 — GitHub Actions CI

Configures automated checks that GitHub runs every time code is pushed or a PR is opened. The checks run ESLint (catches code style issues and obvious bugs) and the TypeScript compiler (catches type errors) on both backend and frontend. This prevents broken code from being merged without the team noticing. Free on GitHub for public/student repos.

- `.github/workflows/backend-ci.yml`:
  ```yaml
  name: Backend CI
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]
  jobs:
    lint-and-typecheck:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: npm
            cache-dependency-path: package-lock.json
        - run: npm ci
        - run: npm run lint --workspace backend
        - run: npm run typecheck --workspace backend
  ```
- `.github/workflows/frontend-ci.yml` — identical structure, but run `npm run lint --workspace frontend` and `npm run typecheck --workspace frontend`.
- Document branch protection rules in `README.md` (configured manually on GitHub by team lead):
  - Require PR review before merge to `main`
  - Require status checks (both CI workflows) to pass
  - No direct pushes to `main`

#### C1.2 — Environment Variable Documentation

The app needs secret keys (database password, Firebase credentials, Google Maps API key) that must never be committed to GitHub. `.env.example` files document every variable the project needs — with blank values — so a new team member knows exactly what to fill in to get set up locally.

Work with Stein and Zilber to produce the final `.env.example` files once all keys are known.

- `backend/.env.example`:
  ```
  # Server
  PORT=3000
  NODE_ENV=development

  # Database
  DATABASE_URL="postgresql://fixlt:fixlt@localhost:5432/fixlt_dev"

  # Firebase Admin (from firebase-service-account.json)
  FIREBASE_PROJECT_ID=
  FIREBASE_CLIENT_EMAIL=
  FIREBASE_PRIVATE_KEY=

  # Google Maps
  GOOGLE_MAPS_API_KEY=
  ```
- `frontend/.env`:
  ```
  EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
  EXPO_PUBLIC_FIREBASE_API_KEY=
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
  EXPO_PUBLIC_FIREBASE_PROJECT_ID=
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
  EXPO_PUBLIC_FIREBASE_APP_ID=
  ```
- Create corresponding `.env.example` files for both with blank values.

> **Dependency note:** C1.2 requires B1.1 (Firebase keys) and A1.3 (DB URL format) to be finalized first.

#### C1.3 — Prisma Seed Infrastructure

A seed script populates the database with realistic test data (users, tasks, bids) using a single command. This lets the team develop and demo the app without manually creating data through the UI every time the database is reset. The script is set up now with placeholder data; real Firebase UIDs are filled in during Phase 2.

- `backend/prisma/seed.ts` skeleton:
  ```typescript
  import { PrismaClient } from '@prisma/client';
  const prisma = new PrismaClient();

  async function main() {
    // Seed users
    // Seed tasks (with real coordinates in Haifa area)
    // Seed bids
    console.log('Seed complete');
  }

  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
  ```
- Define placeholder seed data arrays (actual data added in Phase 2 once Firebase test accounts exist):
  - 6 User objects: 3 acting as Requesters, 3 as Fixers — with `firebase_uid: "PLACEHOLDER_X"` until real UIDs are available
  - 12 Task objects with real `coordinates` (latitude/longitude pairs in Haifa — e.g., Hadar, Carmel, Neve Sha'anan, Downtown), realistic titles and descriptions per category
  - 2–3 Bid objects per task
- Add seed script hook to `backend/package.json`:
  ```json
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
  ```
- Run: `npx prisma db seed` to confirm the script executes without errors (will be mostly no-ops on placeholders).

> **Dependency note:** C1.3 requires A1.4 (Prisma schema migrated) to exist before it can import from `@prisma/client`.

#### C1.4 — README Files

Setup documentation so any team member (or evaluator) can clone the repo and get the backend and frontend running from scratch by following step-by-step instructions — without needing to ask anyone.

- `backend/README.md`:
  ```markdown
  ## Prerequisites
  - Node.js 20+
  - Docker (for local PostgreSQL)

  ## Setup
  1. Clone the repo
  2. `npm install` (from repo root)
  3. Copy `backend/.env.example` to `backend/.env` and fill in values
  4. `docker compose up -d` (starts PostgreSQL + PostGIS)
  5. `cd backend && npx prisma migrate dev` (creates tables)
  6. `cd backend && npx prisma generate` (generates Prisma client)
  7. `npm run dev --workspace backend` (starts the server on port 3000)

  ## NPM Scripts
  | Command | Description |
  |---|---|
  | `npm run dev --workspace backend` | Start with hot reload (nodemon) |
  | `npm run build --workspace backend` | Compile TypeScript to dist/ |
  | `npm start --workspace backend` | Run compiled build |
  | `npm run lint --workspace backend` | ESLint check |

  ## Prisma Commands
  | Command | Description |
  |---|---|
  | `npx prisma migrate dev --name <name>` | Create and apply new migration |
  | `npx prisma generate` | Regenerate Prisma client after schema changes |
  | `npx prisma studio` | Open visual DB browser |
  | `npx prisma db seed` | Run seed script |
  ```
- `frontend/README.md`:
  ```markdown
  ## Prerequisites
  - Node.js 20+
  - Expo SDK via `npx expo` (no global install required)
  - Physical device for validating camera, location, and push notifications

  ## Setup
  1. `npm install` (from repo root)
  2. Copy `frontend/.env.example` to `frontend/.env` and fill in values
  3. `npm run start --workspace frontend`

  ## Run Targets
  | Command | Description |
  |---|---|
  | `npm run ios --workspace frontend` | Run on iOS simulator |
  | `npm run android --workspace frontend` | Run on Android emulator |
  | `npm run web --workspace frontend` | Run in browser |
  | `npm run lint --workspace frontend` | ESLint check |
  ```

---

## Phase 2 — Backend Core

Goal: All API endpoints are implemented and reachable. Auth middleware protects all routes. Notification service is wired to key events. Input validation is applied across all routes.

### Stein — Phase 2

Implements the authentication layer and all task/bid endpoints. The auth middleware is the backbone of the entire API — every protected route depends on it. The bid acceptance endpoint is the most complex piece: it must atomically update multiple records in one database transaction to prevent race conditions.

- `backend/src/config/firebaseAdmin.ts` — Initialize Firebase Admin SDK using env vars.
- `backend/src/middleware/auth.ts` — `authMiddleware`: call `admin.auth().verifyIdToken(token)`, look up User by `firebase_uid`, attach to `req.user`. Return `401` if token missing/invalid, `404` if user not synced yet.
- `POST /api/auth/sync` — Create local User record after Firebase registration. Extract `uid` and `email` from verified token; accept `full_name` and `phone_number?` from body.
- **Task endpoints:**
  - `POST /api/tasks`
  - `GET /api/users/me/tasks` (with `status` filter, pagination)
  - `GET /api/tasks` (PostGIS `ST_DWithin` with `lat`, `lng`, `radius`; filter by category, price; "Quote Required" tasks always included)
  - `GET /api/tasks/:id` (conditionally include `exact_address`)
  - `PUT /api/tasks/:id/status` (valid transitions only)
  - `PUT /api/tasks/:id/confirm-payment`
- **Bid endpoints:**
  - `POST /api/tasks/:id/bids` (enforce 1-bid-per-Fixer unique constraint; enforce 15-bid max)
  - `GET /api/tasks/:id/bids`
  - `GET /api/users/me/bids` (for the Fixer-side "My Bids" screen, with `status`, `page`, and `limit`)
  - `PUT /api/bids/:id/accept` — **Prisma transaction:** set task `IN_PROGRESS`, set `assigned_fixer_id`, auto-reject all other `PENDING` bids, trigger a push notification to the Fixer (call Zilber's `notificationService`)
  - `PUT /api/bids/:id/reject`
  - `PUT /api/bids/:id/withdraw`

### Zilber — Phase 2

Implements user profile management endpoints and the push notification service. The notification service is a shared utility — once it exists, any endpoint can trigger a push notification to a user's device by calling a single function. Also builds the image upload utility used by task creation and profile editing.

- Install backend dependency for mobile push delivery: `npm install -w backend expo-server-sdk`
- `frontend/src/utils/uploadImage.ts` — Takes a local image URI, uploads to Firebase Storage using the client SDK, returns the public download URL. Used by task creation, profile avatar, and portfolio upload flows.
- **User endpoints:**
  - `GET /api/users/me`
  - `PUT /api/users/me` (all editable fields including `specializations`)
  - `GET /api/users/:id` (public profile: portfolio, specializations, recent reviews)
  - `POST /api/users/me/push-token`
- **Portfolio endpoints:**
  - `POST /api/users/me/portfolio`
  - `DELETE /api/users/me/portfolio/:id`
- **Scope note:** Certifications and account deletion remain optional stretch work and should only be added if the core flow is stable.
- `backend/src/services/notificationService.ts` — Core function: accepts `userId`, `title`, `body`, `type`, `related_entity_id`, `related_entity_type`; looks up `push_token` from DB; writes a `Notification` record; and sends the push via the chosen provider. For the initial mobile MVP, use Expo push tokens and the Expo server SDK. Return gracefully if `push_token` is null.
- Wire notification triggers for: new bid submitted (`NEW_BID` → Requester), bid accepted (`BID_ACCEPTED` → Fixer), bid rejected (`BID_REJECTED` → Fixer), task canceled (`TASK_CANCELED` → assigned Fixer / all bidders).

> **Dependency note:** `notificationService` must be ready before Stein can wire bid-acceptance notifications. Communicate via PR when it's merged.

### Shick — Phase 2

Implements the shared infrastructure that all routes depend on: input validation (rejects bad requests before they hit the database) and a global error handler (ensures every error returns a consistent JSON format). Also owns reviews, notifications, and completing the seed script with real data once Firebase test accounts exist.

- `backend/src/middleware/validate.ts` — Validation middleware using `zod`. Each route defines a schema; the middleware calls `schema.parse(req.body)` and returns a `VALIDATION_ERROR` response on failure. Used on all mutation endpoints.
- `backend/src/middleware/errorHandler.ts` — Express error handler: catches thrown errors, returns standard `{ error: { code, message, details } }` format.
- `backend/src/utils/errors.ts` — Define the `AppError` base class and subclasses: `NotFoundError` (404), `ForbiddenError` (403), `ConflictError` (409), `ValidationError` (400), `InternalError` (500). Each holds `code: string`, `message: string`, `httpStatus: number`, and optional `details`. The `errorHandler.ts` middleware catches any thrown `AppError` and serializes it to the standard error response format. Non-`AppError` throws are caught and wrapped as `InternalError`. See Architecture §4.6.
- **Review endpoints:**
  - `POST /api/tasks/:id/reviews` — Enforce: requesting user must be `requester_id`, task must be `COMPLETED`, no existing review for this task, `completed_at` of task ≤ 14 days ago.
  - `GET /api/users/:id/reviews`
- **Notification endpoints:**
  - `GET /api/notifications` — Returns notifications for the authenticated user, sorted by `created_at` descending. Supports `page` and `limit`.
  - `PUT /api/notifications/:id/read`
  - `PUT /api/notifications/read-all`
- Complete `backend/prisma/seed.ts` with real data: create 6 Firebase test accounts manually in the Firebase Console, copy their UIDs into the seed file, fill in realistic Haifa-area coordinates (use actual lat/lng for Hadar, Carmel Center, etc.), task photos (use placeholder URLs from Firebase Storage).

---

## Phase 3 — Frontend Core

Goal: All screens exist on both mobile and web. Navigation is complete. Every screen is connected to the backend API. The app can be run end-to-end from registration through task completion.

### Stein — Phase 3

Builds the Fixer-side of the app: the map-based task discovery feed (the most visually complex screen), task details with bid submission, the bid tracker, and the mode toggle that switches the entire navigation between Requester and Fixer views.

- **Discovery Feed (Fixer mode):**
  - Map View: full-screen `react-native-maps` with `MapView`, custom `Marker` per open task; markers color-coded by `Category`; tap marker → Bottom Preview Card (title, budget, distance, "View Details")
  - List View: `FlatList` of task cards sorted by distance; pull-to-refresh
  - Filter bar: horizontal scrollable chips for distance (5/10/25/50 km), category (multi-select), price range
  - Map ↔ List toggle button in top-right
  - Connect to `GET /api/tasks` with current GPS coords from `expo-location`
  - **Location permission:** Before loading the map, check `expo-location` permission status. If not granted, show a rationale modal explaining why location is needed, then request native permission. If denied, show a city/neighborhood text input as the fallback discovery center. See Screen Layouts §4.1.
- **Task Details — Fixer View:**
  - Photo carousel, description, category badge, budget, requester info (tappable), bid count
  - Sticky bottom bar with three states: "Submit Bid", "Bid Submitted ✓", "No longer accepting bids"
  - Bid Submission Modal: price input, pitch textarea, "Send Offer" → `POST /api/tasks/:id/bids`
- **My Bids screen:**
  - Tab filter bar: All / Pending / Accepted / Rejected / Withdrawn
  - Bid cards with status badges; source data from `GET /api/users/me/bids`; swipe-left on Pending → Withdraw action → `PUT /api/bids/:id/withdraw`
- **Mode Toggle logic:**
  - Top navigation segmented control "Requester / Fixer"
  - On switch: reconfigure bottom tab navigator (different tabs per mode)
  - Preserve state across mode switches (no data loss)
  - **Navigation rule:** The Mode Toggle is hidden when the user navigates into a focused screen (Task Creation Wizard, Task Details, Chat, any screen that is not a root tab). In React Navigation, this is implemented by conditionally rendering the top bar only on the root tab screens. See Screen Layouts §2.1.

### Zilber — Phase 3

Builds the authentication screens and the navigation structure that controls what the app shows based on login state. Also owns the Fixer profile management screen and the image upload flow used throughout the app.

- **Auth screens:**
  - Welcome/Landing screen (logo, Log In + Create Account buttons)
  - Registration screen (Full Name, Email, Password, Confirm Password, optional Phone Number; inline validation)
  - Login screen (Email, Password; Firebase error messages inline)
  - Password Reset screen (email input → `sendPasswordResetEmail()` → success state)
  - Email Verification Banner component (persistent on Dashboard if `!emailVerified`; resend link; dismissible)
- **Navigation structure:**
  - `RootNavigator`: Auth Stack (shown when no session) vs App Stack (shown when authenticated)
  - `onAuthStateChanged` listener in root to switch stacks
  - App Stack → Bottom Tabs (reconfigured by active mode)
- **Fixer Profile Management screen:**
  - Edit form: avatar (tap to upload via `uploadImage.ts`), name, bio, phone
  - Specializations multi-select chips
  - Payment link input with soft warning banner if empty
  - Portfolio grid: 3-column, "+" card to add photo, long-press to delete
- **Public Profile view screen:**
  - Avatar, name, verified badge, rating
  - Bio, specializations chips, portfolio grid, reviews tab
- **Image upload flow:** `expo-image-picker` → `uploadImage.ts` → URL sent to backend.

### Shick — Phase 3

> **⚠ Priority:** Complete the reusable UI component library **first** in Phase 3, before Stein and Zilber begin building screens. Stein's maps and Zilber's auth screens depend on shared components.

- **Design System Setup** (`frontend/src/theme.ts`):
  - Configure `MD3LightTheme` from React Native Paper with the Fixlt color palette: Primary = Deep Navy Blue (`#1A237E`), Secondary = Golden Yellow (`#FFC107`), Surface = Light Gray (`#F5F5F5`).
  - Wrap the app root in `<PaperProvider theme={theme}>`.
  - All screens use Paper primitives directly: `Button`, `TextInput`, `Card`, `Avatar`, `Chip`, `Badge`, `FAB`, `Portal`/`Modal` for bottom sheets.
- **Thin wrapper components** (`frontend/src/components/`) — only where Paper doesn't cover the use case:
  - `StatusBadge` — color-coded task/bid status chip with label (maps `TaskStatus`/`BidStatus` enums to colors)
  - `EmptyState` — illustration + message + optional CTA button
  - `TaskCard` — reusable card layout used across Requester dashboard and Fixer list view
- **Requester Dashboard screen:**
  - Email Verification Banner (if unverified)
  - Active tasks horizontal scroll (OPEN + IN_PROGRESS cards with bid count / assigned fixer name)
  - Past tasks vertical list (COMPLETED + CANCELED)
  - FAB "+" button → Task Creation Wizard
  - Connect to `GET /api/users/me/tasks`
- **Task Creation Wizard (5 steps):**
  - Step 1: Title (max 80) + Description (max 500)
  - Step 2: Photo upload grid (up to 5 via `expo-image-picker` → `uploadImage.ts`)
  - Step 3: Category single-select grid with icons
  - Step 4: Budget toggle (Fixed Price / Quote Required)
  - Step 5: Map pin (general area) + exact address text input
  - **Location permission (Step 5):** On entering Step 5, check `expo-location` permission. If not granted, show a rationale modal before triggering the native dialog. If denied, replace the map with a manual text input for the general area. See Screen Layouts §3.2.
  - Review modal before publish
  - Connect to `POST /api/tasks`
- **Task Details screens (Requester view):**
  - OPEN: photo carousel, bid list with Accept/Decline per bid, "Cancel Task" in overflow menu
  - IN_PROGRESS: assigned fixer card (name, rating, phone), "Mark as Completed", "Cancel Task"
  - COMPLETED: payment section (Pay Fixer deep-link or phone fallback), review prompt (14-day window)
  - Connect to `GET /api/tasks/:id`, `GET /api/tasks/:id/bids`, `PUT /api/bids/:id/accept`, `PUT /api/tasks/:id/status`
- **Settings screen:**
  - Phone number edit
  - "Change Password" → `sendPasswordResetEmail()`
  - Push notifications toggle
  - Log out button

---

## Phase 4 — Real-Time Features

Goal: In-app chat works end-to-end. Push notifications are delivered to background devices. Reviews can be submitted and are displayed on profiles.

### Stein — Phase 4

Sets up the Socket.io server that powers real-time chat. Socket.io keeps a persistent connection open between the client and server, so messages appear instantly without polling. Each task gets its own isolated chat room. If the recipient is offline, a push notification is sent instead.

- Install Socket.io on backend: `npm install -w backend socket.io`
- `backend/src/socket/index.ts` — initialize Socket.io server on the Express HTTP server
- WebSocket auth: on connection handshake, extract `token` from `socket.handshake.auth`, call `admin.auth().verifyIdToken(token)`, look up User; reject connection if invalid
- Room management:
  - `join_chat` event: validate the user is the task's Requester or assigned Fixer; call `socket.join("task_chat_{taskId}")`
  - `send_message` event: validate, persist to `Message` table, emit `receive_message` to room
  - Offline detection: before emitting, check if recipient socket is in the room; if not, call `notificationService` with type `NEW_MESSAGE`
- REST support for chat:
  - `GET /api/tasks/:id/messages` — paginated chat history for an allowed task participant
  - `GET /api/conversations` — conversation summary endpoint used by the Messages tab
- Token refresh: document that client must reconnect with a fresh token if the connection drops after token expiry

> **Dependency note:** Zilber's Chat UI depends on this Socket.io server being ready and the room events being defined.

### Zilber — Phase 4

Builds the chat UI that connects to Stein's Socket.io server, the conversation list, and the push notification registration flow. Push notification registration happens on every app launch — the device token is sent to the backend so the server knows where to deliver notifications for that user.

- **Chat Interface screen** (`frontend/src/screens/shared/Chat.tsx`):
  - Header: other party's avatar + name (tappable to Public Profile) + task title
  - `FlatList` of message bubbles: sent = right-aligned colored; received = left-aligned gray; timestamp on each
  - Load history via `GET /api/tasks/:id/messages` on mount (paginated — load more on scroll-up)
  - Footer input + send button → `send_message` Socket.io event
  - Read-only footer when task is `COMPLETED`
  - Connect Socket.io: `io(baseUrl, { auth: { token } })`, join room on mount, listen for `receive_message`
- **Conversation List screen:**
  - `FlatList` of threads sorted by most recent message; each row shows avatar, name, task title, last message preview, unread badge
  - Connect to `GET /api/conversations`
- **Push notification registration:**
  - On app launch (after auth): call `expo-notifications` to request permissions, get the Expo push token, and `POST /api/users/me/push-token`
- **Notification Center screen:**
  - Chronological list of notification cards (icon, title, body, timestamp, unread highlight)
  - Tap → mark as read (`PUT /api/notifications/:id/read`) → navigate to relevant screen based on `related_entity_type`
  - "Mark All as Read" button → `PUT /api/notifications/read-all`
  - Notification bell badge in top nav (unread count from `GET /api/notifications`)

### Shick — Phase 4

Builds the review submission screen and wires it into the completed task flow, displays reviews on public profiles, and connects the notification center data to the UI built by Zilber.

- **Review screen** (`frontend/src/screens/shared/Review.tsx`):
  - 5-star selector with dynamic label (Poor / Fair / Good / Very Good / Excellent)
  - Optional comment textarea
  - "Submit Review" button (disabled until ≥1 star selected)
  - On submit → `POST /api/tasks/:id/reviews`; success message → navigate back
  - Expired state: "Review period has ended" (if task completed > 14 days ago)
- Wire Review screen into Task Details COMPLETED screen (both as inline prompt and as standalone screen from past tasks)
- **Reviews display on Public Profile:**
  - Reviews tab shows chronological list: reviewer name, stars, comment, date
  - Connect to `GET /api/users/:id/reviews`
- **Notification data integration:**
  - Wire `GET /api/notifications` to Notification Center screen
  - Wire `PUT /api/notifications/:id/read` on notification tap
  - Unread count badge computed from notification list

---

## Phase 5 — Planned Additions

Goal: Hebrew language support, task reopen flow, and read receipts.

### Stein — Phase 5

Adds the task reopen flow (letting a Requester re-post a canceled task) and small supporting API polish for canceled-task UX.

- **Task Reopen:**
  - Backend: `PUT /api/tasks/:id/reopen` — valid only when status is `CANCELED`; reset to `OPEN`, clear `assigned_fixer_id`, task reappears on discovery feed
  - Frontend: "Reopen Task" button on Task Details CANCELED screen (Requester view only)
- **API polish:**
  - Include `bid_count` field in `GET /api/tasks/:id` response so frontend can render correct bottom bar state without an extra request

### Zilber — Phase 5

Adds Hebrew language support. This involves extracting every text string from every screen into translation files, then switching the app's layout direction to right-to-left when Hebrew is active (Hebrew is RTL, which affects flex layouts, text alignment, and icon placement).

- Install i18n library: `npm install i18next react-i18next`
- **Prisma migration:** Add `language String @default("en")` to the `User` model in `schema.prisma` and run `npx prisma migrate dev --name add-user-language`. Update `PUT /api/users/me` to accept `language` as an editable field. See Database Schema §User and Product Overview §3.10.
- Extract ALL string literals from every screen into translation files:
  - `frontend/src/i18n/en.json`
  - `frontend/src/i18n/he.json`
- Configure i18n: default to English; switch to Hebrew when language is set
- Apply RTL layout: `I18nManager.forceRTL(true)` when Hebrew active; test all screens for layout correctness (flex direction, text alignment, icon mirroring where needed)
- Language toggle:
  - Add to Settings screen (EN / HE radio)
  - Add to Welcome screen (EN / HE switch at top-right) — visible once Hebrew is available

### Shick — Phase 5

Focuses on read receipts for chat (marking messages as seen and notifying the sender in real time). Account deletion remains a stretch goal and should only be picked up later if the core app is already stable.

- **Read receipts:**
  - When a user opens a chat, mark all unread messages from the other party as read (`Message.is_read = true`) via a batch DB update
  - Emit a `messages_read` event over Socket.io so the sender's chat UI can update their sent message indicators
  - Coordinate with Stein: define the `messages_read` event payload format before implementation

---

## Phase 6 — Polish & Demo

Goal: The app runs end-to-end with realistic seed data in a deployed environment. Demo is presentable.

### Stein — Phase 6

- Integration testing: test all API endpoints using Postman or Thunder Client; document expected request/response for each
- Review PostGIS query plan (`EXPLAIN ANALYZE`) on the discovery feed query with seed data loaded — confirm spatial index is used
- Bug fixes: focus on bidding state machine edge cases and task status transitions

### Zilber — Phase 6

- Deploy the frontend web build to Vercel using Expo Web's export/build flow (for example: export the web app, then deploy the generated output)
- Review and tighten Firebase Storage security rules (restrict reads to authenticated users if needed)
- Bug fixes: focus on auth flow edge cases (expired token, offline behavior) and notification delivery

### Shick — Phase 6

- Finalize seed script with complete realistic data:
  - Real Firebase UIDs (from manually created test accounts)
  - Real Haifa coordinates for each task (Hadar, Carmel Center, German Colony, Bat Galim, etc.)
  - Firebase Storage URLs for task photos (upload a few sample images in advance)
  - Bid and review data creating a plausible history for each Fixer
  - Run `npx prisma db seed` and confirm data appears correctly in Prisma Studio and on the live app
- Backend deployment:
  - Deploy Node.js server to Render or Railway
  - Provision PostgreSQL + PostGIS on Supabase (supports PostGIS natively) or Railway
  - Run migrations on production DB: `npx prisma migrate deploy`
  - Set all environment variables on the hosting platform
- Demo walkthrough script: step-by-step flow document covering: Register as Requester → Create task → Switch to Fixer → Browse discovery map → Submit bid → Accept bid → Chat → Mark complete → Leave review
