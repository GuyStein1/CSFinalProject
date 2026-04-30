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
- `backend/src/**/*.d.ts` (TypeScript declaration files)
- `frontend/src/context/AccessibilityContext.tsx` (uses DOM APIs not available in the React Native Jest environment)
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

A `.env.test` file at the repo root is already included with the correct `TEST_DATABASE_URL`. Just run:

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
  middleware/
    auth.test.ts          ← Tests authMiddleware directly (invalid token, user not in DB)
  routes/
    auth.test.ts
    auth.firebase-error.test.ts  ← Firebase errorInfo.code branch
    users.test.ts
    tasks.test.ts
    bids.test.ts
    notifications.test.ts

frontend/src/
  __mocks__/              ← Mock modules (firebase, api, socket.io-client, etc.)
    setup-globals.ts      ← Polyfills for expo winter runtime globals (structuredClone, etc.)
  hooks/__tests__/
    useTasks.test.ts
    useAuthBootstrap.test.ts
    useNotifications.test.ts
    useBids.test.ts
    useReviews.test.ts
  utils/__tests__/
    socket.test.ts
    uploadImage.test.ts
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
// __esModule: true is required — ts-jest uses it to decide whether to use .default
jest.mock('../../config/firebaseAdmin', () => ({
  __esModule: true,
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

### Multi-user backend test pattern

When a test needs to act as different users (e.g., requester accepts fixer's bid), use the dynamic UID factory pattern instead of a static mock:

```typescript
jest.mock('../../config/firebaseAdmin', () => {
  let currentUid = 'test-uid';
  return {
    __esModule: true,
    default: {
      auth: () => ({
        verifyIdToken: jest.fn().mockImplementation(() => Promise.resolve({ uid: currentUid })),
      }),
      apps: [{}],
    },
    __setUid: (uid: string) => { currentUid = uid; },
  };
});

// In tests — switch identity before each request:
const { __setUid } = jest.requireMock('../../config/firebaseAdmin') as { __setUid: (uid: string) => void };
__setUid('fixer-uid');
await request(app).post(`/api/tasks/${taskId}/bids`)...
__setUid('test-uid');
await request(app).put(`/api/bids/${bidId}/accept`)...
```

### Note: tests run serially

Backend tests share a single PostgreSQL test database and run with `maxWorkers: 1`. This prevents unique-constraint violations that occur when multiple test files run cleanup + create in parallel. Do not change `maxWorkers` without also implementing per-test transaction rollback or separate DB schemas.

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
| `frontend/src/__mocks__/firebase.ts` | `auth.currentUser`, `getIdToken`, `storage` | If new Firebase methods are used |
| `frontend/src/__mocks__/api.ts` | `api.get/post/put/delete` | Rarely — the mock covers all methods |
| `frontend/src/__mocks__/socket.io-client.ts` | `io()`, socket `on/off/emit/disconnect` | If new socket events are added |
| `frontend/src/__mocks__/expo-notifications.ts` | Permission + token APIs | If new Expo Notifications methods are called |
| `frontend/src/__mocks__/expo-constants.ts` | `expoConfig.extra.eas.projectId` | If projectId changes |
| `frontend/src/__mocks__/setup-globals.ts` | Polyfills `__ExpoImportMetaRegistry` and `structuredClone` for the expo winter runtime | Only if new lazy globals cause "cannot be used outside a module" errors |
| `backend/src/__tests__/__mocks__/expo-server-sdk.ts` | CJS stub for the pure-ESM `expo-server-sdk` package | If `Expo.sendPushNotificationsAsync` API changes |

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
