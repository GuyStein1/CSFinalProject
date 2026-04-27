// CommonJS-compatible stub for expo-server-sdk (which is ESM-only).
// Used by default in all backend tests via moduleNameMapper in jest.config.ts.
// notificationService.test.ts overrides this with its own jest.mock() factory.
export class Expo {
  static isExpoPushToken = jest.fn().mockReturnValue(true);
  sendPushNotificationsAsync = jest.fn().mockResolvedValue([{ status: 'ok' }]);
}

export type ExpoPushMessage = {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
};
