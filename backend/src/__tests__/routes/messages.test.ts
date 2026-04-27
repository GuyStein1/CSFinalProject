// Dynamic UID mock — allows multi-user scenarios within one test file
jest.mock('../../config/firebaseAdmin', () => {
  let currentUid = 'requester-uid';
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
const REQUESTER_AUTH = 'Bearer requester-token';
const FIXER_AUTH = 'Bearer fixer-token';
const OTHER_AUTH = 'Bearer other-token';
const { __setUid } = jest.requireMock('../../config/firebaseAdmin') as { __setUid: (uid: string) => void };

let requesterId: string;
let fixerId: string;

beforeEach(async () => {
  await cleanDatabase();

  __setUid('requester-uid');
  const requester = await createTestUser({ firebase_uid: 'requester-uid', email: 'requester@example.com', full_name: 'Requester' });
  requesterId = requester.id;

  __setUid('fixer-uid');
  const fixer = await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@example.com', full_name: 'Fixer' });
  fixerId = fixer.id;

  await createTestUser({ firebase_uid: 'other-uid', email: 'other@example.com', full_name: 'Other' });

  __setUid('requester-uid');
});

afterAll(() => prisma.$disconnect());

// ── Helpers ───────────────────────────────────────────────────────────────────

// Creates a task via the API, has fixer bid, requester accepts → IN_PROGRESS
async function createTaskInProgress(): Promise<{ id: string }> {
  __setUid('requester-uid');
  const taskRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', REQUESTER_AUTH)
    .send({
      title: 'Fix my sink',
      description: 'Dripping tap under the kitchen sink needs replacement.',
      category: 'PLUMBING',
      general_location_name: 'Tel Aviv',
      exact_address: '1 Dizengoff St, Tel Aviv',
      lat: 32.08,
      lng: 34.78,
    });
  const taskId = taskRes.body.task.id as string;

  __setUid('fixer-uid');
  const bidRes = await request(app)
    .post(`/api/tasks/${taskId}/bids`)
    .set('Authorization', FIXER_AUTH)
    .send({ offered_price: 200, description: 'I can fix it fast.' });
  const bidId = bidRes.body.bid.id as string;

  __setUid('requester-uid');
  await request(app)
    .put(`/api/bids/${bidId}/accept`)
    .set('Authorization', REQUESTER_AUTH);

  return { id: taskId };
}

async function seedMessages(taskId: string) {
  await prisma.message.createMany({
    data: [
      { task_id: taskId, sender_id: requesterId, recipient_id: fixerId, content: 'Hello fixer!' },
      { task_id: taskId, sender_id: fixerId, recipient_id: requesterId, content: 'Hello requester!' },
      { task_id: taskId, sender_id: requesterId, recipient_id: fixerId, content: 'When can you come?' },
    ],
  });
}

// ── GET /api/tasks/:id/messages ───────────────────────────────────────────────

describe('GET /api/tasks/:id/messages', () => {
  it('returns paginated messages for the requester', async () => {
    const task = await createTaskInProgress();
    await seedMessages(task.id);

    __setUid('requester-uid');
    const res = await request(app)
      .get(`/api/tasks/${task.id}/messages`)
      .set('Authorization', REQUESTER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(3);
    expect(res.body.meta).toMatchObject({ total: 3, page: 1, limit: 30 });
  });

  it('returns paginated messages for the fixer', async () => {
    const task = await createTaskInProgress();
    await seedMessages(task.id);

    __setUid('fixer-uid');
    const res = await request(app)
      .get(`/api/tasks/${task.id}/messages`)
      .set('Authorization', FIXER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(3);
  });

  it('respects limit and page query params', async () => {
    const task = await createTaskInProgress();
    await seedMessages(task.id);

    __setUid('requester-uid');
    const res = await request(app)
      .get(`/api/tasks/${task.id}/messages?page=1&limit=2`)
      .set('Authorization', REQUESTER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ total: 3, page: 1, limit: 2 });
  });

  it('returns 403 for a non-participant', async () => {
    const task = await createTaskInProgress();

    __setUid('other-uid');
    const res = await request(app)
      .get(`/api/tasks/${task.id}/messages`)
      .set('Authorization', OTHER_AUTH);

    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent task', async () => {
    __setUid('requester-uid');
    const res = await request(app)
      .get('/api/tasks/non-existent-id/messages')
      .set('Authorization', REQUESTER_AUTH);

    expect(res.status).toBe(404);
  });

  it('returns 401 without auth header', async () => {
    const task = await createTaskInProgress();
    const res = await request(app).get(`/api/tasks/${task.id}/messages`);
    expect(res.status).toBe(401);
  });

  it('includes sender info on each message', async () => {
    const task = await createTaskInProgress();
    await seedMessages(task.id);

    __setUid('requester-uid');
    const res = await request(app)
      .get(`/api/tasks/${task.id}/messages`)
      .set('Authorization', REQUESTER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.messages[0].sender).toMatchObject({ full_name: 'Requester' });
  });
});

// ── GET /api/conversations ────────────────────────────────────────────────────

describe('GET /api/conversations', () => {
  it('returns conversation summaries for the requester', async () => {
    const task = await createTaskInProgress();
    await seedMessages(task.id);

    __setUid('requester-uid');
    const res = await request(app)
      .get('/api/conversations')
      .set('Authorization', REQUESTER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.conversations).toHaveLength(1);
    expect(res.body.conversations[0]).toMatchObject({
      taskId: task.id,
      taskTitle: 'Fix my sink',
    });
  });

  it('includes the last message preview', async () => {
    const task = await createTaskInProgress();
    await seedMessages(task.id);

    __setUid('requester-uid');
    const res = await request(app)
      .get('/api/conversations')
      .set('Authorization', REQUESTER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.conversations[0].lastMessage).not.toBeNull();
    expect(res.body.conversations[0].lastMessage.content).toBe('When can you come?');
  });

  it('counts unread messages correctly', async () => {
    const task = await createTaskInProgress();
    // Fixer sends 2 unread messages to requester
    await prisma.message.createMany({
      data: [
        { task_id: task.id, sender_id: fixerId, recipient_id: requesterId, content: 'msg 1', is_read: false },
        { task_id: task.id, sender_id: fixerId, recipient_id: requesterId, content: 'msg 2', is_read: false },
      ],
    });

    __setUid('requester-uid');
    const res = await request(app)
      .get('/api/conversations')
      .set('Authorization', REQUESTER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.conversations[0].unreadCount).toBe(2);
  });

  it('excludes tasks with no messages', async () => {
    await createTaskInProgress();

    __setUid('requester-uid');
    const res = await request(app)
      .get('/api/conversations')
      .set('Authorization', REQUESTER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.conversations).toHaveLength(0);
  });

  it('returns 401 without auth header', async () => {
    const res = await request(app).get('/api/conversations');
    expect(res.status).toBe(401);
  });

  it('returns empty array for a user with no conversations', async () => {
    __setUid('other-uid');
    const res = await request(app)
      .get('/api/conversations')
      .set('Authorization', OTHER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.conversations).toHaveLength(0);
  });
});
