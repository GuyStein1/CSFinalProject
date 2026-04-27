import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  globalSetup: '<rootDir>/src/__tests__/globalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/globalTeardown.ts',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/loadEnv.ts'],
  // Shared PostgreSQL test DB — run files serially to avoid cross-file data conflicts
  maxWorkers: 1,
  // expo-server-sdk is pure ESM; replace it with a CommonJS stub for all tests.
  // notificationService.test.ts overrides this with its own jest.mock() factory.
  moduleNameMapper: {
    '^expo-server-sdk$': '<rootDir>/src/__tests__/__mocks__/expo-server-sdk.ts',
  },
  coverageThreshold: {
    global: { lines: 80, branches: 80 },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/config/**',
    '!src/__tests__/**',
    '!src/**/*.d.ts',
  ],
};

export default config;
