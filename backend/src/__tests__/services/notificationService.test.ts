jest.mock('../../config/prisma', () => ({
  prisma: {
    notification: { create: jest.fn().mockResolvedValue({}) },
    user: { findUnique: jest.fn() },
  },
}));

// The service creates `const expo = new Expo()` at module load time (singleton).
// We expose __mockSendFn so tests can assert on the SAME function used by the service.
jest.mock('expo-server-sdk', () => {
  const mockSendFn = jest.fn().mockResolvedValue([{ status: 'ok' }]);
  return {
    Expo: Object.assign(
      jest.fn().mockImplementation(() => ({ sendPushNotificationsAsync: mockSendFn })),
      {
        isExpoPushToken: jest.fn().mockReturnValue(true),
        __mockSendFn: mockSendFn,
      },
    ),
  };
});

import { prisma } from '../../config/prisma';
import { sendNotification } from '../../services/notificationService';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const { Expo } = jest.requireMock('expo-server-sdk') as {
  Expo: jest.Mock & { isExpoPushToken: jest.Mock; __mockSendFn: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
  // Restore default: valid token format, successful push
  Expo.isExpoPushToken.mockReturnValue(true);
  Expo.__mockSendFn.mockResolvedValue([{ status: 'ok' }]);
});

describe('sendNotification', () => {
  it('always persists a notification record to the DB', async () => {
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ push_token: null });
    await sendNotification('user-1', 'Title', 'Body', 'NEW_BID', 'task-1', 'Task');
    expect(mockedPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ user_id: 'user-1', title: 'Title', type: 'NEW_BID' }),
      }),
    );
  });

  it('does NOT send push when user has no token', async () => {
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ push_token: null });
    await sendNotification('user-1', 'Title', 'Body', 'NEW_BID', 'task-1', 'Task');
    expect(Expo.__mockSendFn).not.toHaveBeenCalled();
  });

  it('does NOT send push when token fails isExpoPushToken validation', async () => {
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ push_token: 'invalid-token' });
    Expo.isExpoPushToken.mockReturnValue(false);
    await sendNotification('user-1', 'Title', 'Body', 'NEW_BID', 'task-1', 'Task');
    expect(Expo.__mockSendFn).not.toHaveBeenCalled();
  });

  it('sends push when user has a valid Expo token', async () => {
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      push_token: 'ExponentPushToken[valid]',
    });
    await sendNotification('user-1', 'Title', 'Body', 'BID_ACCEPTED', 'task-1', 'Task');
    expect(Expo.__mockSendFn).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ to: 'ExponentPushToken[valid]', title: 'Title' }),
      ]),
    );
  });

  it('never throws even if DB create fails', async () => {
    (mockedPrisma.notification.create as jest.Mock).mockRejectedValue(new Error('DB down'));
    await expect(
      sendNotification('user-1', 'Title', 'Body', 'NEW_BID', 'task-1', 'Task'),
    ).resolves.toBeUndefined();
  });

  it('never throws even if push delivery fails', async () => {
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      push_token: 'ExponentPushToken[valid]',
    });
    Expo.__mockSendFn.mockRejectedValue(new Error('Expo service down'));
    await expect(
      sendNotification('user-1', 'Title', 'Body', 'BID_ACCEPTED', 'task-1', 'Task'),
    ).resolves.toBeUndefined();
  });
});
