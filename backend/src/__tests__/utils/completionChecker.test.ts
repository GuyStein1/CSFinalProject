jest.mock('../../config/prisma', () => ({
  prisma: {
    task: { findMany: jest.fn(), update: jest.fn() },
    user: { update: jest.fn() },
    notification: { findFirst: jest.fn() },
    review: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../services/notificationService', () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}));

import { prisma } from '../../config/prisma';
import { sendNotification } from '../../services/notificationService';
import { checkPendingCompletions } from '../../utils/completionChecker';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedSendNotification = sendNotification as jest.Mock;

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function makeTask(overrides: Partial<{
  id: string;
  title: string;
  requester_id: string;
  assigned_fixer_id: string | null;
  fixer_completed_at: Date | null;
  fixer: { full_name: string } | null;
}> = {}) {
  return {
    id: 'task-1',
    title: 'Fix the pipe',
    requester_id: 'requester-1',
    assigned_fixer_id: 'fixer-1',
    fixer_completed_at: hoursAgo(50),
    fixer: { full_name: 'Bob the Fixer' },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Simulate $transaction calling the callback with the mocked prisma
  (mockedPrisma.$transaction as jest.Mock).mockImplementation(
    async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(mockedPrisma),
  );
  (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([]);
  (mockedPrisma.notification.findFirst as jest.Mock).mockResolvedValue(null);
  (mockedPrisma.review.findUnique as jest.Mock).mockResolvedValue(null);
  (mockedPrisma.task.update as jest.Mock).mockResolvedValue({});
  (mockedPrisma.user.update as jest.Mock).mockResolvedValue({});
});

describe('checkPendingCompletions', () => {
  it('does nothing when no pending tasks are found', async () => {
    (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([]);

    await checkPendingCompletions();

    expect(mockedSendNotification).not.toHaveBeenCalled();
  });

  it('skips a task with null fixer_completed_at', async () => {
    (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([
      makeTask({ fixer_completed_at: null }),
    ]);

    await checkPendingCompletions();

    expect(mockedSendNotification).not.toHaveBeenCalled();
  });

  it('does nothing when elapsed time is under 48 hours', async () => {
    (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([
      makeTask({ fixer_completed_at: hoursAgo(24) }),
    ]);

    await checkPendingCompletions();

    expect(mockedSendNotification).not.toHaveBeenCalled();
  });

  describe('reminder (48h–7d)', () => {
    it('sends a reminder when no recent reminder exists', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([
        makeTask({ fixer_completed_at: hoursAgo(50) }),
      ]);
      (mockedPrisma.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await checkPendingCompletions();

      expect(mockedSendNotification).toHaveBeenCalledTimes(1);
      expect(mockedSendNotification).toHaveBeenCalledWith(
        'requester-1',
        'Confirm Completion',
        expect.stringContaining('Bob the Fixer'),
        'TASK_COMPLETED',
        'task-1',
        'Task',
      );
    });

    it('uses fallback "The fixer" when fixer name is missing', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([
        makeTask({ fixer_completed_at: hoursAgo(50), fixer: null }),
      ]);
      (mockedPrisma.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await checkPendingCompletions();

      expect(mockedSendNotification).toHaveBeenCalledWith(
        'requester-1',
        'Confirm Completion',
        expect.stringContaining('The fixer'),
        'TASK_COMPLETED',
        'task-1',
        'Task',
      );
    });

    it('does not send a duplicate reminder when one was already sent', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([
        makeTask({ fixer_completed_at: hoursAgo(50) }),
      ]);
      (mockedPrisma.notification.findFirst as jest.Mock).mockResolvedValue({ id: 'notif-1' });

      await checkPendingCompletions();

      expect(mockedSendNotification).not.toHaveBeenCalled();
    });
  });

  describe('auto-complete (≥7 days)', () => {
    it('updates task status to COMPLETED and notifies both parties', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([
        makeTask({ fixer_completed_at: hoursAgo(24 * 8) }),
      ]);

      await checkPendingCompletions();

      expect(mockedPrisma.$transaction).toHaveBeenCalled();
      expect(mockedPrisma.task.update as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED', requester_completed: true }),
        }),
      );
      expect(mockedPrisma.user.update as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fixer-1' },
          data: { completed_tasks_as_fixer: { increment: 1 } },
        }),
      );
    });

    it('sends auto-complete notifications to requester and fixer, and review nudge when no review', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([
        makeTask({ fixer_completed_at: hoursAgo(24 * 8) }),
      ]);
      (mockedPrisma.review.findUnique as jest.Mock).mockResolvedValue(null);

      await checkPendingCompletions();

      expect(mockedSendNotification).toHaveBeenCalledTimes(3);
      expect(mockedSendNotification).toHaveBeenCalledWith(
        'requester-1', 'Task Auto-Completed', expect.any(String), 'TASK_COMPLETED', 'task-1', 'Task',
      );
      expect(mockedSendNotification).toHaveBeenCalledWith(
        'fixer-1', 'Task Completed', expect.any(String), 'TASK_COMPLETED', 'task-1', 'Task',
      );
      expect(mockedSendNotification).toHaveBeenCalledWith(
        'requester-1', 'Leave a Review', expect.any(String), 'TASK_COMPLETED', 'task-1', 'Task',
      );
    });

    it('skips review nudge when a review already exists', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([
        makeTask({ fixer_completed_at: hoursAgo(24 * 8) }),
      ]);
      (mockedPrisma.review.findUnique as jest.Mock).mockResolvedValue({ id: 'review-1' });

      await checkPendingCompletions();

      expect(mockedSendNotification).toHaveBeenCalledTimes(2);
      const titles = mockedSendNotification.mock.calls.map((c: unknown[]) => c[1]);
      expect(titles).not.toContain('Leave a Review');
    });

    it('skips fixer notification and counter update when assigned_fixer_id is null', async () => {
      (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([
        makeTask({ fixer_completed_at: hoursAgo(24 * 8), assigned_fixer_id: null }),
      ]);
      (mockedPrisma.review.findUnique as jest.Mock).mockResolvedValue(null);

      await checkPendingCompletions();

      expect(mockedPrisma.user.update as jest.Mock).not.toHaveBeenCalled();
      const recipients = mockedSendNotification.mock.calls.map((c: unknown[]) => c[0]);
      expect(recipients).not.toContain(null);
      // Only requester auto-complete + review nudge (no fixer notification)
      expect(mockedSendNotification).toHaveBeenCalledTimes(2);
    });
  });

  it('catches and swallows errors without throwing', async () => {
    (mockedPrisma.task.findMany as jest.Mock).mockRejectedValue(new Error('DB down'));

    await expect(checkPendingCompletions()).resolves.toBeUndefined();
  });
});
