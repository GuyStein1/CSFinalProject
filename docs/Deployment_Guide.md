# Deployment Guide

FixIt is deployed across two platforms. Every push to `main` redeploys automatically — no manual
steps after a PR merges.

| Service | Platform | Notes |
|---|---|---|
| Backend API | **Railway** | Node.js + Express; runs `prisma migrate deploy` then starts the server |
| Database | **Railway** | `postgis/postgis:16-3.4` Docker image (PostgreSQL 16 + PostGIS) |
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
| `PORT` | HTTP port for the Express server (Railway injects this; the app reads `process.env.PORT`) |
| `CORS_ORIGINS` | Comma-separated allow-list of origins for CORS + the Socket.io handshake (e.g. `https://fixit-one-mocha.vercel.app,https://<preview>.vercel.app`) |

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

The database runs on Railway using the official `postgis/postgis:16-3.4` image.

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

The Vercel CLI is **not** in the repo — install it globally the first time you need it, then link the project:

```bash
npm i -g vercel      # or: npx vercel@latest ...
cd frontend
vercel link          # guy-stein-s-projects → fixit

vercel ls                          # list deployments and status
vercel logs <deployment-url>       # logs for a specific deployment
vercel inspect <deployment-url>
```

---

## Mobile — EAS Build + EAS Update

Mobile builds and over-the-air JS updates go through **Expo Application Services (EAS)**.

### Build (native binary)

Native builds are triggered manually with `eas build` and run in Expo's cloud. `frontend/eas.json` defines a `preview` profile that emits an Android **APK** (installable via sideload) with the `EXPO_PUBLIC_*` env vars baked in:

```bash
cd frontend
eas build -p android --profile preview    # Android APK
eas build -p ios --profile preview        # iOS (requires an Apple team / provisioning)
```

The build URL and download link are printed at the end and also visible at <https://expo.dev/accounts/fixit.dev/projects/fixit/builds>. The APK is signed with an EAS-managed Android keystore; the same keystore is reused across builds so the SHA-1 fingerprint (registered as an Android OAuth client on Firebase / Google Maps API key restrictions) stays stable.

### OTA update (JS bundle only)

Once a native binary is installed on a device, JS-only changes ship as an **EAS Update** on the `production` channel — no rebuild required. A GitHub Actions workflow at `frontend/.eas/workflows/update.yml` publishes an update automatically on every push to `main`. To publish manually:

```bash
cd frontend
eas update --channel production --message "Short description of the change"
```

Devices pull the new bundle in the background on next launch.

---

## Local development database

The local Postgres + PostGIS instance is defined in `docker-compose.yml` at the repo root:

```bash
docker compose up -d
```

The compose file currently provisions the database with the username `fixlt` (historical typo — kept for backwards compatibility with existing developer machines whose `.env` files already reference it). If you set up a fresh clone and edit your local `backend/.env` to use `fixit`, remember to update `docker-compose.yml` to match. The hosted database on Railway uses different credentials that Railway injects via `DATABASE_URL`.

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
