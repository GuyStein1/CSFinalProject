jest.mock('../../config/firebaseAdmin', () => {
  let currentUid = 'req-uid';
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

import request from 'supertest';
import app from '../../app';
import { prisma } from '../../config/prisma';
import { cleanDatabase, createTestUser } from '../setup';
import { checkPendingCompletions } from '../../utils/completionChecker';

const REQUESTER_AUTH = 'Bearer req-token';
const FIXER_AUTH = 'Bearer fix-token';
const { __setUid } = jest.requireMock('../../config/firebaseAdmin') as { __setUid: (uid: string) => void };

beforeEach(async () => {
  await cleanDatabase();
  __setUid('req-uid');
  await createTestUser({ firebase_uid: 'req-uid', email: 'req@test.com' });
  await createTestUser({ firebase_uid: 'fix-uid', email: 'fix@test.com' });
});
afterAll(() => prisma.$disconnect());

const validTask = {
  title: 'Test task',
  description: 'Needs fixing',
  category: 'PLUMBING',
  general_location_name: 'Tel Aviv',
  exact_address: '1 Test St',
  lat: 32.08,
  lng: 34.78,
};

// Helper: create task via API, accept bid, confirm payment, fixer confirms completion,
// then back-date fixer_completed_at to simulate elapsed time
async function createPendingTask(hoursAgo: number) {
  __setUid('req-uid');
  const taskRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', REQUESTER_AUTH)
    .send(validTask);
  const taskId = taskRes.body.task.id as string;

  // Fixer submits bid
  __setUid('fix-uid');
  const bidRes = await request(app)
    .post(`/api/tasks/${taskId}/bids`)
    .set('Authorization', FIXER_AUTH)
    .send({ offered_price: 100, description: 'I can do it.' });
  const bidId = bidRes.body.bid.id as string;

  // Requester accepts bid
  __setUid('req-uid');
  await request(app)
    .put(`/api/bids/${bidId}/accept`)
    .set('Authorization', REQUESTER_AUTH);

  // Confirm payment
  await request(app)
    .put(`/api/tasks/${taskId}/confirm-payment`)
    .set('Authorization', REQUESTER_AUTH);

  // Fixer confirms completion
  __setUid('fix-uid');
  await request(app)
    .put(`/api/tasks/${taskId}/confirm-completion`)
    .set('Authorization', FIXER_AUTH);

  // Back-date fixer_completed_at
  await prisma.task.update({
    where: { id: taskId },
    data: {
      fixer_completed_at: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
    },
  });

  // Clear notifications created during setup
  await prisma.notification.deleteMany();

  __setUid('req-uid');
  return taskId;
}

describe('checkPendingCompletions', () => {
  it('does nothing for tasks where fixer completed less than 48h ago', async () => {
    const taskId = await createPendingTask(24);

    await checkPendingCompletions();

    const updated = await prisma.task.findUnique({ where: { id: taskId } });
    expect(updated!.status).toBe('IN_PROGRESS');

    const notifications = await prisma.notification.findMany();
    expect(notifications).toHaveLength(0);
  });

  it('sends a reminder notification after 48h', async () => {
    const taskId = await createPendingTask(72);

    await checkPendingCompletions();

    const updated = await prisma.task.findUnique({ where: { id: taskId } });
    expect(updated!.status).toBe('IN_PROGRESS');

    const notifications = await prisma.notification.findMany({
      where: { title: 'Confirm Completion' },
    });
    expect(notifications).toHaveLength(1);
  });

  it('does not send duplicate reminders within 48h', async () => {
    await createPendingTask(72);

    await checkPendingCompletions();
    await checkPendingCompletions();

    const notifications = await prisma.notification.findMany({
      where: { title: 'Confirm Completion' },
    });
    expect(notifications).toHaveLength(1);
  });

  it('auto-completes task after 7 days', async () => {
    const taskId = await createPendingTask(7 * 24 + 1);

    await checkPendingCompletions();

    const updated = await prisma.task.findUnique({ where: { id: taskId } });
    expect(updated!.status).toBe('COMPLETED');
    expect(updated!.requester_completed).toBe(true);
    expect(updated!.completed_at).not.toBeNull();

    // Should notify both parties
    const autoCompleteNotifs = await prisma.notification.findMany({
      where: { title: 'Task Auto-Completed' },
    });
    expect(autoCompleteNotifs).toHaveLength(1);

    const fixerNotifs = await prisma.notification.findMany({
      where: { title: 'Task Completed' },
    });
    expect(fixerNotifs).toHaveLength(1);
  });

  it('sends review nudge on auto-complete only if no review exists', async () => {
    await createPendingTask(7 * 24 + 1);

    await checkPendingCompletions();

    const reviewNudge = await prisma.notification.findMany({
      where: { title: 'Leave a Review' },
    });
    expect(reviewNudge).toHaveLength(1);
  });

  it('skips review nudge on auto-complete if review already exists', async () => {
    const taskId = await createPendingTask(7 * 24 + 1);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    await prisma.review.create({
      data: {
        task_id: taskId,
        reviewer_id: task!.requester_id,
        reviewee_id: task!.assigned_fixer_id!,
        rating: 5,
      },
    });

    await checkPendingCompletions();

    const reviewNudge = await prisma.notification.findMany({
      where: { title: 'Leave a Review' },
    });
    expect(reviewNudge).toHaveLength(0);
  });
});
