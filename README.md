# FixIt — CS Final Project

A task marketplace connecting Requesters (people who need small jobs done) with Fixers (skilled locals who want to earn money). Built with React Native (Expo), Node.js/Express, PostgreSQL + PostGIS, and Firebase Auth.

---

## Live URLs

| Service | URL |
|---|---|
| **Frontend (Web)** | https://fixit-one-mocha.vercel.app |
| **Backend API** | https://fixit-api-production.up.railway.app |
| **API Health Check** | https://fixit-api-production.up.railway.app/health |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native + Expo (iOS / Android / Web), TypeScript |
| Backend | Node.js + Express, TypeScript |
| Database | PostgreSQL + PostGIS (geospatial queries) |
| ORM | Prisma |
| Auth | Firebase Authentication |
| Real-time | Socket.io (chat) |
| Push Notifications | Expo Push Service |
| Storage | Firebase Storage |
| Maps | Google Maps API |
| i18n | English + Hebrew (RTL) |

---

## Infrastructure

| Service | Platform | Purpose |
|---|---|---|
| Backend API | Railway | Node.js Express server |
| Database | Railway (PostGIS Docker) | PostgreSQL + PostGIS |
| Frontend | Vercel | Static Expo web build |

---

## Branch Protection

The `main` branch is protected:
- All changes must go through a **Pull Request**
- Both backend and frontend CI checks must pass before merging
- No direct pushes to `main`

---

## Local Development Setup

### Prerequisites
- Node.js >= 20
- npm >= 9
- PostgreSQL with PostGIS (local)
- A Firebase project (already configured — see `.env` files)

### 1. Clone and install

```bash
git clone https://github.com/GuyStein1/CSFinalProject.git
cd CSFinalProject
npm install
```

### 2. Set up environment variables

**Backend** — create `backend/.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/fixlt_dev
FIREBASE_PROJECT_ID=fixit-dev-fd366
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@fixit-dev-fd366.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Frontend** — create `frontend/.env`:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=fixit-dev-fd366.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=fixit-dev-fd366
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=fixit-dev-fd366.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
```

> Ask a teammate for the actual secret values — never commit `.env` files.

### 3. Run database migrations

```bash
cd backend
npx prisma migrate dev
```

### 4. Start the backend

```bash
npm run dev --workspace backend
# Runs on http://localhost:3000
```

### 5. Start the frontend

```bash
npm run dev:frontend
# Press W to open in browser, I for iOS simulator, A for Android
```

---

## Running Tests

```bash
# Backend tests
npm test --workspace backend

# Frontend tests
npm test --workspace frontend
```

---

## Deployment

### How it works

Every push to `main` automatically:
- Triggers a **Railway** redeploy of the backend (runs `prisma migrate deploy` then starts the server)
- Triggers a **Vercel** redeploy of the frontend (runs `expo export --platform web` and serves the static output)

No manual steps needed after merging a PR.

### Railway CLI (for backend logs, debugging, running commands)

**Install:**
```bash
npm install -g @railway/cli
```

**Login & link:**
```bash
railway login        # opens browser to authenticate
railway link         # select: guystein1's Projects → fixit → production → fixit-api
```

**Useful commands:**
```bash
railway logs                          # tail live backend logs
railway status                        # show deployment status of all services
railway run npx prisma migrate deploy # run migrations manually
railway variables list --service fixit-api --kv  # view all env vars
```

### Vercel CLI (for frontend logs and deployment info)

**Already installed** as a dev dependency. Link the project once:
```bash
cd frontend
npx vercel link     # select: guy-stein-s-projects → fixit
```

**Useful commands:**
```bash
npx vercel ls                          # list deployments and their status
npx vercel logs <deployment-url>       # view logs for a specific deployment
npx vercel inspect <deployment-url>    # inspect deployment details
```

---

## Environment Variables (Production)

Production env vars live in Railway and Vercel — they are **not** in the repo.

### Backend (Railway — fixit-api service)
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (auto-provided by Railway PostGIS service) |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK private key |
| `NODE_ENV` | Set to `production` |

To add or update a variable:
```bash
railway variable set KEY=value --service fixit-api
```

### Frontend (Vercel — fixit project)
All `EXPO_PUBLIC_*` variables from `frontend/.env` are set in Vercel's dashboard under **Project Settings → Environment Variables**.

---

## Database

The database runs on **Railway** using the official `postgis/postgis:16-master` Docker image (PostgreSQL 16 + PostGIS).

- **Internal hostname:** `postgis.railway.internal:5432`
- **Database name:** `railway`
- **Migrations:** run automatically on each backend deploy via `npx prisma migrate deploy`
- **PostGIS extension:** enabled — used for geospatial task queries (find tasks near location, distance sorting)

To add a new migration locally:
```bash
cd backend
npx prisma migrate dev --name describe_your_change
```

---

## Project Structure

```
CSFinalProject/
├── backend/          Node.js + Express API
│   ├── src/
│   │   ├── routes/   One file per domain (tasks, bids, users, auth, messages, admin)
│   │   ├── middleware/
│   │   ├── services/ notificationService, etc.
│   │   ├── socket/   Socket.io chat server
│   │   └── config/   Prisma + Firebase Admin init
│   └── prisma/       schema.prisma + migrations + seed.ts
├── frontend/         React Native + Expo app
│   └── src/
│       ├── screens/
│       ├── navigation/
│       ├── components/
│       ├── hooks/
│       ├── api/      axiosInstance (auto-attaches Firebase token)
│       └── i18n/     en.json + he.json
└── docs/             Source-of-truth specs and architecture docs
```

---

## Team

Stein, Zilber, Shick — see `docs/07_Development_Plan.md` for task assignments.
