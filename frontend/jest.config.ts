import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  // Runs after jest-expo's preset setupFiles (which install __ExpoImportMetaRegistry
  // as a lazy getter), replacing it with a concrete object so tests don't trigger
  // native module resolution.
  setupFiles: ['<rootDir>/src/__mocks__/setup-globals.ts'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^../config/firebase$': '<rootDir>/src/__mocks__/firebase.ts',
    '^../../config/firebase$': '<rootDir>/src/__mocks__/firebase.ts',
    '^../api/axiosInstance$': '<rootDir>/src/__mocks__/api.ts',
    '^../../api/axiosInstance$': '<rootDir>/src/__mocks__/api.ts',
    '^socket\\.io-client$': '<rootDir>/src/__mocks__/socket.io-client.ts',
    '^expo-notifications$': '<rootDir>/src/__mocks__/expo-notifications.ts',
    '^expo-constants$': '<rootDir>/src/__mocks__/expo-constants.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  coverageThreshold: {
    global: { lines: 80, branches: 80 },
  },
  collectCoverageFrom: [
    'src/hooks/**/*.ts',
    'src/utils/**/*.ts',
    'src/context/**/*.tsx',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    // Web-platform DOM code (CSS injection, classList, TreeWalker) is untestable in RN Jest
    '!src/context/AccessibilityContext.tsx',
  ],
};

export default config;
