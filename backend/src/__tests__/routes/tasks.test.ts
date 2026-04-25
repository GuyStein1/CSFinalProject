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

const AUTH = 'Bearer mock-token';

const validTask = {
  title: 'Fix my sink',
  description: 'Dripping tap under the kitchen sink needs replacement.',
  category: 'PLUMBING',
  general_location_name: 'Tel Aviv',
  exact_address: '1 Dizengoff St, Tel Aviv',
  lat: 32.08,
  lng: 34.78,
};

beforeEach(async () => {
  await cleanDatabase();
  await createTestUser();
});
afterAll(() => prisma.$disconnect());

describe('POST /api/tasks', () => {
  it('creates a task and returns 201', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send(validTask);

    expect(res.status).toBe(201);
    expect(res.body.task).toMatchObject({ title: 'Fix my sink', status: 'OPEN' });
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send({ title: 'Only title' });

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth header', async () => {
    const res = await request(app).post('/api/tasks').send(validTask);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns task details', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send(validTask);
    const taskId = created.body.task.id;

    const res = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', AUTH);

    expect(res.status).toBe(200);
    expect(res.body.task.id).toBe(taskId);
  });

  it('returns 404 for non-existent task', async () => {
    const res = await request(app)
      .get('/api/tasks/non-existent-id')
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/tasks/:id', () => {
  it('updates task title and description', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send(validTask);
    const taskId = created.body.task.id;

    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', AUTH)
      .send({ title: 'Updated title' });

    expect(res.status).toBe(200);
    expect(res.body.task.title).toBe('Updated title');
  });
});

describe('PUT /api/tasks/:id/status', () => {
  it('requester can cancel an OPEN task', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send(validTask);
    const taskId = created.body.task.id;

    const res = await request(app)
      .put(`/api/tasks/${taskId}/status`)
      .set('Authorization', AUTH)
      .send({ status: 'CANCELED' });

    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('CANCELED');
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('deletes the task', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', AUTH)
      .send(validTask);
    const taskId = created.body.task.id;

    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', AUTH);

    expect(res.status).toBe(200);
    expect(await prisma.task.findUnique({ where: { id: taskId } })).toBeNull();
  });
});
