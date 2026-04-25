# 09 — Testing Guide

## Overview

This project uses **Jest** throughout. There are two independent test suites:

| Suite | Runner | Coverage target | Needs external services? |
|-------|--------|----------------|--------------------------|
| Backend | Jest + Supertest | ≥ 80% lines + branches | PostgreSQL (local) |
| Frontend | jest-expo + RNTL | ≥ 80% lines + branches (hooks/utils/context only) | None |

### What is tested

**Backend:** Unit tests for error classes, validation middleware, Zod schemas, and the notification service. Integration (functional) tests for every API route — these hit a real PostgreSQL+PostGIS database via Supertest and test the full request → middleware → DB → response cycle.

**Frontend:** Pure logic layer — custom hooks (`useTasks`, `useAuthBootstrap`, `useBids`, `useNotifications`, `useReviews`), utilities (`socket.ts`, `uploadImage.ts`), and the `NotificationContext`. Screen components are intentionally excluded from the 80% target: they require complex navigation/Firebase mocking for little incremental value.

### What is deliberately excluded from coverage

- Screen components (too much nav/Firebase mocking overhead)
- `backend/src/index.ts` (just calls `app.listen()`)
- `backend/src/config/**` (environment bootstrapping)
- Theme constants (`frontend/src/theme.ts`)

---

## Running tests locally

### Frontend (no external services needed)

```bash
# Run all frontend tests
npm run test --workspace frontend -- --watchAll=false

# With coverage report
npm run test:coverage --workspace frontend -- --watchAll=false

# Watch mode (during development)
npm run test --workspace frontend
```

### Backend (requires PostgreSQL)

Make sure PostgreSQL is running (e.g., via Docker or a local install). The test database is **created automatically** on the first run.

```bash
# Run all backend tests (auto-creates fixit_test DB if needed)
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fixit_test \
  npm run test --workspace backend

# With coverage report
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fixit_test \
  npm run test:coverage --workspace backend
```

Or create a `.env.test` file at the repo root (already included — see `.env.test`), then just run:

```bash
npm run test --workspace backend
```

The `globalSetup.ts` script will:
1. Connect to your local Postgres
2. `CREATE DATABASE fixit_test` if it doesn't exist
3. Run `prisma migrate deploy` to bring the schema up to date
4. PostGIS extension is enabled automatically by the first migration

---

## Test file locations

```
backend/src/__tests__/
  globalSetup.ts          ← DB auto-create + migrate (runs once before all tests)
  globalTeardown.ts       ← Prisma disconnect
  loadEnv.ts              ← Loads .env.test before each test file
  setup.ts                ← Shared helpers: cleanDatabase(), createTestUser()
  utils/
    errors.test.ts
  middleware/
    errorHandler.test.ts
    validate.test.ts
  schemas.test.ts
  services/
    notificationService.test.ts
  routes/
    auth.test.ts
    users.test.ts
    tasks.test.ts
    bids.test.ts
    notifications.test.ts

frontend/src/
  __mocks__/              ← Mock modules (firebase, api, socket.io-client, etc.)
  hooks/__tests__/
    useTasks.test.ts
    useNotifications.test.ts
    useBids.test.ts
    useReviews.test.ts
  utils/__tests__/
    socket.test.ts
  context/__tests__/
    NotificationContext.test.tsx
```

---

## Adding new tests

### Convention

- Co-locate test files in a `__tests__/` directory next to the source file.
- Name: `<SourceFile>.test.ts` (or `.test.tsx` for JSX).
- Use `test.each` (Jest's equivalent of `[Theory]` in .NET) whenever you have 3+ cases that share the same test body but differ only in data. Use `it()` for standalone single cases.

### Backend integration test pattern

```typescript
// 1. Mock Firebase Admin at the top (before any imports that trigger it)
jest.mock('../../config/firebaseAdmin', () => ({
  default: {
    auth: () => ({ verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-uid' }) }),
    apps: [{}],
  },
}));

import request from 'supertest';
import app from '../../app';
import { prisma } from '../../config/prisma';
import { cleanDatabase, createTestUser } from '../setup';

beforeEach(async () => {
  await cleanDatabase();           // wipe all tables
  await createTestUser();          // create the user Firebase auth will resolve to
});

afterAll(() => prisma.$disconnect());

it('does something', async () => {
  const res = await request(app)
    .post('/api/some-endpoint')
    .set('Authorization', 'Bearer mock-token')
    .send({ field: 'value' });
  expect(res.status).toBe(201);
});
```

### Frontend hook test pattern

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import useMyHook from '../useMyHook';
import api from '../../api/axiosInstance';

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.get.mockResolvedValue({ data: { items: [] } });
});

it('loads items', async () => {
  const { result } = renderHook(() => useMyHook());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.items).toHaveLength(0);
});
```

### Mocks reference

| Mock file | What it mocks | When to update |
|-----------|--------------|----------------|
| `src/__mocks__/firebase.ts` | `auth.currentUser`, `getIdToken`, `storage` | If new Firebase methods are used |
| `src/__mocks__/api.ts` | `api.get/post/put/delete` | Rarely — the mock covers all methods |
| `src/__mocks__/socket.io-client.ts` | `io()`, socket `on/off/emit/disconnect` | If new socket events are added |
| `src/__mocks__/expo-notifications.ts` | Permission + token APIs | If new Expo Notifications methods are called |
| `src/__mocks__/expo-constants.ts` | `expoConfig.extra.eas.projectId` | If projectId changes |

---

## Coverage reports

After running with `--coverage`, an HTML report is written to `coverage/lcov-report/index.html`. Open it in a browser for a line-by-line view.

```bash
open backend/coverage/lcov-report/index.html   # macOS
open frontend/coverage/lcov-report/index.html
```

The 80% threshold is enforced in `jest.config.ts` for both workspaces. If a PR drops coverage below 80%, the CI `test` job will fail with an exit code 1.

---

## CI

Both GitHub Actions workflows (`.github/workflows/backend-ci.yml` and `frontend-ci.yml`) run two jobs: `lint-and-typecheck` and `test`. Both must pass for a PR to be mergeable.

The backend `test` job spins up a `postgis/postgis:16-3.4` service container automatically — no manual DB setup needed in CI.

---

## Team convention (going forward)

> Every PR that adds or modifies feature code must include corresponding tests. Coverage must stay ≥ 80% across the relevant files. If a piece of code genuinely cannot be tested (e.g., a React Native platform-specific renderer), add a comment explaining why and exclude it from coverage with `/* istanbul ignore next */`.
