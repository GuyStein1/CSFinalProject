# Deployment Guide

## Backend — Render

### Option A: Blueprint (recommended)
1. Push `render.yaml` to `main`
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. Connect the GitHub repo → Render reads `render.yaml` and creates the service
4. Set the required environment variables (see below)

### Option B: Manual
1. Go to Render → **New Web Service**
2. Connect the repo, set **Root Directory** to `backend`
3. Build command: `npm install && npx prisma generate && npm run build`
4. Start command: `npx prisma migrate deploy && npm run start`
5. Set environment variables

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL+PostGIS connection string (from Supabase) |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key (preserve `\n` newlines) |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `NODE_ENV` | `production` |
| `PORT` | Auto-set by Render |

---

## Database — Supabase (PostGIS)

1. Create a new project on [Supabase](https://supabase.com)
2. PostGIS is enabled by default
3. Copy the **Connection String** (Settings → Database → URI)
4. Use it as `DATABASE_URL` on Render
5. Run migrations: they run automatically on deploy (`npx prisma migrate deploy`)
6. Seed (optional): `npx prisma db seed` locally with `DATABASE_URL` pointing to Supabase

---

## Frontend — Vercel (Zilber's task)

1. Install Vercel CLI: `npm i -g vercel`
2. From `frontend/`: `npx expo export --platform web`
3. Deploy: `vercel --prod` (or connect repo on Vercel dashboard)
4. Set `EXPO_PUBLIC_API_URL` to the Render backend URL

---

## Post-Deploy Verification

1. Hit `GET <backend-url>/health` → should return `{ "status": "ok" }`
2. Hit `GET <backend-url>/api/tasks?lat=32.08&lng=34.78&radius=50` → should return seeded tasks
3. Open frontend → login with seeded account → verify dashboard loads

---

## Seeding Production Database

```bash
# Point DATABASE_URL to production
export DATABASE_URL="postgresql://..."
cd backend
npx prisma db seed
```

⚠️ The seed script has a safety check — it will NOT run if `NODE_ENV=production`. To seed production, temporarily unset it or run:

```bash
NODE_ENV=development npx prisma db seed
```
