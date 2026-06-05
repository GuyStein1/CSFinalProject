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
  // Explicit timestamps so orderBy created_at is deterministic even in fast tests
  const base = Date.now();
  await prisma.message.create({ data: { task_id: taskId, sender_id: requesterId, recipient_id: fixerId, content: 'Hello fixer!', created_at: new Date(base) } });
  await prisma.message.create({ data: { task_id: taskId, sender_id: fixerId, recipient_id: requesterId, content: 'Hello requester!', created_at: new Date(base + 1) } });
  await prisma.message.create({ data: { task_id: taskId, sender_id: requesterId, recipient_id: fixerId, content: 'When can you come?', created_at: new Date(base + 2) } });
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

// ── GET /api/tasks/:id/messages — pending-bid access ─────────────────────────

describe('GET /api/tasks/:id/messages (pending-bid access)', () => {
  it('allows a fixer with a pending bid to read messages', async () => {
    // Requester creates a task, fixer bids but bid is NOT accepted
    __setUid('requester-uid');
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', REQUESTER_AUTH)
      .send({
        title: 'Pending bid task',
        description: 'Need some work done.',
        category: 'PLUMBING',
        general_location_name: 'Tel Aviv',
        exact_address: '1 Test St',
        lat: 32.08,
        lng: 34.78,
      });
    const taskId = taskRes.body.task.id as string;

    __setUid('fixer-uid');
    await request(app)
      .post(`/api/tasks/${taskId}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 150, description: 'I can do it.' });

    // Seed a message directly so there is something to fetch
    await prisma.message.create({
      data: { task_id: taskId, sender_id: requesterId, recipient_id: fixerId, content: 'Hello, are you available?' },
    });

    __setUid('fixer-uid');
    const res = await request(app)
      .get(`/api/tasks/${taskId}/messages`)
      .set('Authorization', FIXER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
  });
});

// ── PUT /api/tasks/:id/messages/read ─────────────────────────────────────────

describe('PUT /api/tasks/:id/messages/read', () => {
  it('marks all unread messages for the caller as read and returns ok', async () => {
    const task = await createTaskInProgress();
    // Seed 3 unread messages sent to the requester
    await prisma.message.createMany({
      data: [
        { task_id: task.id, sender_id: fixerId, recipient_id: requesterId, content: 'msg 1', is_read: false },
        { task_id: task.id, sender_id: fixerId, recipient_id: requesterId, content: 'msg 2', is_read: false },
        { task_id: task.id, sender_id: requesterId, recipient_id: fixerId, content: 'my msg', is_read: false },
      ],
    });

    __setUid('requester-uid');
    const res = await request(app)
      .put(`/api/tasks/${task.id}/messages/read`)
      .set('Authorization', REQUESTER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Only the requester's received messages should be marked read
    const stillUnread = await prisma.message.count({
      where: { task_id: task.id, recipient_id: requesterId, is_read: false },
    });
    expect(stillUnread).toBe(0);
  });

  it('returns 404 for a non-existent task', async () => {
    __setUid('requester-uid');
    const res = await request(app)
      .put('/api/tasks/non-existent-id/messages/read')
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(404);
  });

  it('returns 403 for a non-participant', async () => {
    const task = await createTaskInProgress();

    __setUid('other-uid');
    const res = await request(app)
      .put(`/api/tasks/${task.id}/messages/read`)
      .set('Authorization', OTHER_AUTH);
    expect(res.status).toBe(403);
  });

  it('returns 401 without auth header', async () => {
    const task = await createTaskInProgress();
    const res = await request(app).put(`/api/tasks/${task.id}/messages/read`);
    expect(res.status).toBe(401);
  });

  it('allows a fixer with a pending bid to mark messages as read', async () => {
    __setUid('requester-uid');
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', REQUESTER_AUTH)
      .send({
        title: 'Pending read task',
        description: 'Need work.',
        category: 'PLUMBING',
        general_location_name: 'Tel Aviv',
        exact_address: '1 Test St',
        lat: 32.08,
        lng: 34.78,
      });
    const taskId = taskRes.body.task.id as string;

    __setUid('fixer-uid');
    await request(app)
      .post(`/api/tasks/${taskId}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 150, description: 'I can do it.' });

    await prisma.message.create({
      data: { task_id: taskId, sender_id: requesterId, recipient_id: fixerId, content: 'Hi', is_read: false },
    });

    __setUid('fixer-uid');
    const res = await request(app)
      .put(`/api/tasks/${taskId}/messages/read`)
      .set('Authorization', FIXER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ── PUT /api/tasks/:id/messages/read — messages_read emit ────────────────────

describe('PUT /api/tasks/:id/messages/read (read receipts)', () => {
  it('only marks messages where the caller is recipient', async () => {
    const task = await createTaskInProgress();
    // Fixer sends 2 messages to requester; requester sends 1 to fixer
    await prisma.message.createMany({
      data: [
        { task_id: task.id, sender_id: fixerId, recipient_id: requesterId, content: 'hi 1', is_read: false },
        { task_id: task.id, sender_id: fixerId, recipient_id: requesterId, content: 'hi 2', is_read: false },
        { task_id: task.id, sender_id: requesterId, recipient_id: fixerId, content: 'reply', is_read: false },
      ],
    });

    __setUid('requester-uid');
    await request(app)
      .put(`/api/tasks/${task.id}/messages/read`)
      .set('Authorization', REQUESTER_AUTH);

    // Requester's unread should be 0, fixer's unread stays 1
    const requesterUnread = await prisma.message.count({ where: { task_id: task.id, recipient_id: requesterId, is_read: false } });
    const fixerUnread = await prisma.message.count({ where: { task_id: task.id, recipient_id: fixerId, is_read: false } });
    expect(requesterUnread).toBe(0);
    expect(fixerUnread).toBe(1);
  });

  it('is idempotent — calling again when already read returns ok', async () => {
    const task = await createTaskInProgress();

    __setUid('requester-uid');
    const res = await request(app)
      .put(`/api/tasks/${task.id}/messages/read`)
      .set('Authorization', REQUESTER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
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

  it('includes conversations for a fixer with pending bid', async () => {
    // Requester creates task, fixer bids (not accepted), then messages are exchanged
    __setUid('requester-uid');
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', REQUESTER_AUTH)
      .send({
        title: 'Bid chat task',
        description: 'Testing conversations with pending bid.',
        category: 'PLUMBING',
        general_location_name: 'Haifa',
        exact_address: '5 Herzl St',
        lat: 32.81,
        lng: 34.99,
      });
    const taskId = taskRes.body.task.id as string;

    __setUid('fixer-uid');
    await request(app)
      .post(`/api/tasks/${taskId}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 100, description: 'I can help.' });

    // Seed messages between them
    await prisma.message.create({
      data: { task_id: taskId, sender_id: requesterId, recipient_id: fixerId, content: 'Hi, interested?' },
    });

    __setUid('fixer-uid');
    const res = await request(app)
      .get('/api/conversations')
      .set('Authorization', FIXER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.conversations).toHaveLength(1);
    expect(res.body.conversations[0].otherParty?.full_name).toBe('Requester');
  });

  it('shows the correct other party name for both sides', async () => {
    const task = await createTaskInProgress();
    await seedMessages(task.id);

    // Requester sees Fixer
    __setUid('requester-uid');
    const reqRes = await request(app)
      .get('/api/conversations')
      .set('Authorization', REQUESTER_AUTH);
    expect(reqRes.body.conversations[0].otherParty?.full_name).toBe('Fixer');

    // Fixer sees Requester
    __setUid('fixer-uid');
    const fixRes = await request(app)
      .get('/api/conversations')
      .set('Authorization', FIXER_AUTH);
    expect(fixRes.body.conversations[0].otherParty?.full_name).toBe('Requester');
  });

  it('filters conversations by mode=requester', async () => {
    const task = await createTaskInProgress();
    await seedMessages(task.id);

    // Requester in requester mode sees conversations (they own the task)
    __setUid('requester-uid');
    const res = await request(app)
      .get('/api/conversations?mode=requester')
      .set('Authorization', REQUESTER_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.conversations).toHaveLength(1);

    // Fixer in requester mode sees nothing (they don't own the task)
    __setUid('fixer-uid');
    const fixRes = await request(app)
      .get('/api/conversations?mode=requester')
      .set('Authorization', FIXER_AUTH);
    expect(fixRes.status).toBe(200);
    expect(fixRes.body.conversations).toHaveLength(0);
  });

  it('filters conversations by mode=fixer', async () => {
    const task = await createTaskInProgress();
    await seedMessages(task.id);

    // Fixer in fixer mode sees conversations (they are not the requester)
    __setUid('fixer-uid');
    const res = await request(app)
      .get('/api/conversations?mode=fixer')
      .set('Authorization', FIXER_AUTH);
    expect(res.status).toBe(200);
    expect(res.body.conversations).toHaveLength(1);

    // Requester in fixer mode sees nothing (they own the task)
    __setUid('requester-uid');
    const reqRes = await request(app)
      .get('/api/conversations?mode=fixer')
      .set('Authorization', REQUESTER_AUTH);
    expect(reqRes.status).toBe(200);
    expect(reqRes.body.conversations).toHaveLength(0);
  });
});

// ── Messages deleted on task completion ──────────────────────────────────────

describe('Task completion preserves messages', () => {
  it('keeps messages when task is completed via dual-confirm', async () => {
    const task = await createTaskInProgress();
    await seedMessages(task.id);

    // Verify messages exist
    const before = await prisma.message.count({ where: { task_id: task.id } });
    expect(before).toBe(3);

    // Complete the task via dual-confirm flow
    __setUid('requester-uid');
    await request(app)
      .put(`/api/tasks/${task.id}/confirm-payment`)
      .set('Authorization', REQUESTER_AUTH);
    await request(app)
      .put(`/api/tasks/${task.id}/confirm-completion`)
      .set('Authorization', REQUESTER_AUTH);
    __setUid('fixer-uid');
    await request(app)
      .put(`/api/tasks/${task.id}/confirm-completion`)
      .set('Authorization', FIXER_AUTH);

    // Messages should be preserved for past conversations
    const after = await prisma.message.count({ where: { task_id: task.id } });
    expect(after).toBe(3);
  });
});
