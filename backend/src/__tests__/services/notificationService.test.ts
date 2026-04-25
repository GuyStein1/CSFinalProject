jest.mock('../../config/prisma', () => ({
  prisma: {
    notification: { create: jest.fn().mockResolvedValue({}) },
    user: { findUnique: jest.fn() },
  },
}));

jest.mock('expo-server-sdk', () => ({
  Expo: Object.assign(
    jest.fn().mockImplementation(() => ({
      sendPushNotificationsAsync: jest.fn().mockResolvedValue([]),
    })),
    { isExpoPushToken: jest.fn().mockReturnValue(true) },
  ),
}));

import { prisma } from '../../config/prisma';
import { sendNotification } from '../../services/notificationService';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('sendNotification', () => {
  it('always persists a notification record to the DB', async () => {
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ push_token: null });
    await sendNotification('user-1', 'Title', 'Body', 'NEW_BID', 'task-1', 'Task');
    expect(mockedPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ user_id: 'user-1', title: 'Title' }),
      }),
    );
  });

  it('does NOT send push when user has no token', async () => {
    const { Expo } = jest.requireMock('expo-server-sdk');
    const mockExpo = new Expo();
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ push_token: null });
    await sendNotification('user-1', 'Title', 'Body', 'NEW_BID', 'task-1', 'Task');
    expect(mockExpo.sendPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it('sends push when user has a valid Expo token', async () => {
    const { Expo } = jest.requireMock('expo-server-sdk');
    const mockExpo = new Expo();
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      push_token: 'ExponentPushToken[valid]',
    });
    await sendNotification('user-1', 'Title', 'Body', 'BID_ACCEPTED', 'task-1', 'Task');
    expect(mockExpo.sendPushNotificationsAsync).toHaveBeenCalled();
  });

  it('never throws even if DB fails', async () => {
    (mockedPrisma.notification.create as jest.Mock).mockRejectedValue(new Error('DB down'));
    await expect(
      sendNotification('user-1', 'Title', 'Body', 'NEW_BID', 'task-1', 'Task'),
    ).resolves.toBeUndefined();
  });
});
