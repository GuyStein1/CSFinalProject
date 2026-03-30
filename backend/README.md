# Backend

Node.js + Express API server with Prisma ORM and PostgreSQL + PostGIS.

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
| `npm run typecheck --workspace backend` | TypeScript type check |

## Prisma Commands

| Command | Description |
|---|---|
| `npx prisma migrate dev --name <name>` | Create and apply new migration |
| `npx prisma generate` | Regenerate Prisma client after schema changes |
| `npx prisma studio` | Open visual DB browser |
| `npx prisma db seed` | Run seed script |
