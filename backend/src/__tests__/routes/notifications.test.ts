jest.mock('../../config/firebaseAdmin', () => ({
  default: {
    auth: () => ({ verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-uid' }) }),
    apps: [{}],
  },
}));

import request from 'supertest';
import app from '../../app';
import { prisma } from '../../config/prisma';
import { cleanDatabase, createTestUser } from '../setup';

let userId: string;

beforeEach(async () => {
  await cleanDatabase();
  const user = await createTestUser();
  userId = user.id;
});
afterAll(() => prisma.$disconnect());

async function createNotif(overrides: { is_read?: boolean; type?: string } = {}) {
  return prisma.notification.create({
    data: {
      user_id: userId,
      title: 'Test',
      body: 'Test body',
      type: (overrides.type ?? 'NEW_BID') as never,
      related_entity_id: 'task-1',
      related_entity_type: 'Task',
      is_read: overrides.is_read ?? false,
    },
  });
}

const AUTH = 'Bearer mock-token';

describe('GET /api/notifications', () => {
  it('returns user notifications', async () => {
    await createNotif();
    await createNotif();
    const res = await request(app).get('/api/notifications').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.notifications.length).toBeGreaterThanOrEqual(2);
  });
});

describe('PUT /api/notifications/:id/read', () => {
  it('marks notification as read', async () => {
    const notif = await createNotif({ is_read: false });
    const res = await request(app)
      .put(`/api/notifications/${notif.id}/read`)
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    const updated = await prisma.notification.findUnique({ where: { id: notif.id } });
    expect(updated?.is_read).toBe(true);
  });

  it('returns 404 for non-existent notification', async () => {
    const res = await request(app)
      .put('/api/notifications/non-existent-id/read')
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/notifications/read-all', () => {
  it('marks all notifications as read', async () => {
    await createNotif({ is_read: false });
    await createNotif({ is_read: false });
    const res = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    const unread = await prisma.notification.count({ where: { user_id: userId, is_read: false } });
    expect(unread).toBe(0);
  });
});

describe('DELETE /api/notifications/:id', () => {
  it('deletes a notification', async () => {
    const notif = await createNotif();
    const res = await request(app)
      .delete(`/api/notifications/${notif.id}`)
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    const deleted = await prisma.notification.findUnique({ where: { id: notif.id } });
    expect(deleted).toBeNull();
  });
});
