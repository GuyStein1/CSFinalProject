# Frontend

React Native / Expo app for iOS, Android, and web.

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
