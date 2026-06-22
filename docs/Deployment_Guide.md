# Deployment Guide

FixIt is deployed across two platforms. Every push to `main` redeploys automatically — no manual
steps after a PR merges.

| Service | Platform | Notes |
|---|---|---|
| Backend API | **Railway** | Node.js + Express; runs `prisma migrate deploy` then starts the server |
| Database | **Railway** | `postgis/postgis:16-master` Docker image (PostgreSQL 16 + PostGIS) |
| Frontend (web) | **Vercel** | `expo export --platform web` → static build |

**Live URLs**

| Service | URL |
|---|---|
| Web app | https://fixit-one-mocha.vercel.app |
| API | https://fixit-api-production.up.railway.app |
| API health check | https://fixit-api-production.up.railway.app/health |

---

## Backend — Railway

The backend redeploys on every push to `main`. On each deploy Railway runs
`npx prisma migrate deploy` and then starts the server.

### Environment variables (Railway — `fixit-api` service)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (auto-provided by the Railway PostGIS service) |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK private key (preserve `\n` newlines) |
| `NODE_ENV` | `production` |

Production env vars live in Railway — they are **not** in the repo.

### Railway CLI

```bash
npm install -g @railway/cli

railway login        # opens browser to authenticate
railway link         # guystein1's Projects → fixit → production → fixit-api

railway logs                                     # tail live backend logs
railway status                                   # deployment status of all services
railway run npx prisma migrate deploy            # run migrations manually
railway variables list --service fixit-api --kv  # view all env vars
railway variables set KEY=value --service fixit-api
```

---

## Database — Railway (PostGIS)

The database runs on Railway using the official `postgis/postgis:16-master` image.

- **Internal hostname:** `postgis.railway.internal:5432`
- **Database name:** `railway`
- **Migrations:** run automatically on each backend deploy (`npx prisma migrate deploy`)
- **PostGIS:** enabled — powers geospatial task queries (tasks near a location, distance sorting)

Add a new migration locally:

```bash
cd backend
npx prisma migrate dev --name describe_your_change
```

---

## Frontend — Vercel

The web build redeploys on every push to `main`: Vercel runs `expo export --platform web` and
serves the static output. All `EXPO_PUBLIC_*` variables from `frontend/.env` are configured in
the Vercel dashboard under **Project Settings → Environment Variables**.

### Vercel CLI

The Vercel CLI is already a dev dependency. Link the project once:

```bash
cd frontend
npx vercel link     # guy-stein-s-projects → fixit

npx vercel ls                      # list deployments and status
npx vercel logs <deployment-url>   # logs for a specific deployment
npx vercel inspect <deployment-url>
```

---

## Firebase — authorized domains

For login to work on a deployed URL, that domain must be whitelisted in Firebase:

1. Open the [Firebase Console → Authentication → Settings](https://console.firebase.google.com/project/fixit-dev-fd366/authentication/settings)
2. Go to **Authorized domains**
3. Add the domain (e.g. `fixit-one-mocha.vercel.app` — already added)

> Deploying to a new domain (or a teammate's preview URL) requires adding it here before login works.

---

## Post-deploy verification

1. `GET <api-url>/health` → `{ "status": "ok" }`
2. `GET <api-url>/api/tasks?lat=32.08&lng=34.78&radius=50` → returns tasks
3. Open the web app → sign in with a [demo account](Demo_Users.md) → confirm the dashboard loads

---

## Seeding

The local seed (`backend/prisma/seed.ts`) refuses to run when `NODE_ENV=production` as a safety
check. The shared playground database is seeded separately; see the team's internal notes before
running any seed against a hosted database.

```bash
cd backend
npx prisma db seed     # local only
```
