jest.mock('../../config/firebaseAdmin', () => {
  let currentUid = 'test-uid';
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

const { __setUid } = jest.requireMock('../../config/firebaseAdmin') as { __setUid: (uid: string) => void };

const FIXER_AUTH = 'Bearer fixer-token';
const ADMIN_AUTH = 'Bearer admin-token';
const REQUESTER_AUTH = 'Bearer requester-token';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(() => prisma.$disconnect());

// ── Fixer certification submission ──────────────────────────────────────────

describe('POST /api/users/me/certifications', () => {
  it('fixer submits cert for a category in their specializations → 201', async () => {
    __setUid('fixer-uid');
    const fixer = await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@test.com', full_name: 'Test Fixer' });
    await prisma.user.update({ where: { id: fixer.id }, data: { specializations: ['ELECTRICITY', 'PLUMBING'] } });

    const res = await request(app)
      .post('/api/users/me/certifications')
      .set('Authorization', FIXER_AUTH)
      .send({ category: 'ELECTRICITY', title: 'Licensed Electrician', document_url: 'https://example.com/cert.pdf' });

    expect(res.status).toBe(201);
    expect(res.body.certification).toMatchObject({
      category: 'ELECTRICITY',
      title: 'Licensed Electrician',
      status: 'PENDING',
    });
  });

  it('fixer submits cert for category NOT in specializations → 403', async () => {
    __setUid('fixer-uid');
    const fixer = await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@test.com', full_name: 'Test Fixer' });
    await prisma.user.update({ where: { id: fixer.id }, data: { specializations: ['PLUMBING'] } });

    const res = await request(app)
      .post('/api/users/me/certifications')
      .set('Authorization', FIXER_AUTH)
      .send({ category: 'ELECTRICITY', title: 'Licensed Electrician', document_url: 'https://example.com/cert.pdf' });

    expect(res.status).toBe(403);
  });

  it('fixer submits duplicate cert (same category, PENDING) → 409', async () => {
    __setUid('fixer-uid');
    const fixer = await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@test.com', full_name: 'Test Fixer' });
    await prisma.user.update({ where: { id: fixer.id }, data: { specializations: ['ELECTRICITY'] } });

    // First submission
    await request(app)
      .post('/api/users/me/certifications')
      .set('Authorization', FIXER_AUTH)
      .send({ category: 'ELECTRICITY', title: 'Licensed Electrician', document_url: 'https://example.com/cert.pdf' });

    // Duplicate
    const res = await request(app)
      .post('/api/users/me/certifications')
      .set('Authorization', FIXER_AUTH)
      .send({ category: 'ELECTRICITY', title: 'Licensed Electrician v2', document_url: 'https://example.com/cert2.pdf' });

    expect(res.status).toBe(409);
  });

  it('fixer submits cert when already APPROVED → 409', async () => {
    __setUid('fixer-uid');
    const fixer = await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@test.com', full_name: 'Test Fixer' });
    await prisma.user.update({ where: { id: fixer.id }, data: { specializations: ['ELECTRICITY'] } });

    await prisma.certification.create({
      data: {
        fixer_id: fixer.id,
        category: 'ELECTRICITY',
        title: 'Approved Cert',
        document_url: 'https://example.com/cert.pdf',
        status: 'APPROVED',
      },
    });

    const res = await request(app)
      .post('/api/users/me/certifications')
      .set('Authorization', FIXER_AUTH)
      .send({ category: 'ELECTRICITY', title: 'Another Cert', document_url: 'https://example.com/cert2.pdf' });

    expect(res.status).toBe(409);
  });

  it('fixer re-uploads after rejection → 200', async () => {
    __setUid('fixer-uid');
    const fixer = await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@test.com', full_name: 'Test Fixer' });
    await prisma.user.update({ where: { id: fixer.id }, data: { specializations: ['ELECTRICITY'] } });

    // Create a rejected certification directly
    await prisma.certification.create({
      data: {
        fixer_id: fixer.id,
        category: 'ELECTRICITY',
        title: 'Old Cert',
        document_url: 'https://example.com/old.pdf',
        status: 'REJECTED',
        rejection_note: 'Illegible',
      },
    });

    const res = await request(app)
      .post('/api/users/me/certifications')
      .set('Authorization', FIXER_AUTH)
      .send({ category: 'ELECTRICITY', title: 'New Cert', document_url: 'https://example.com/new.pdf' });

    expect(res.status).toBe(200);
    expect(res.body.certification).toMatchObject({
      category: 'ELECTRICITY',
      title: 'New Cert',
      document_url: 'https://example.com/new.pdf',
      status: 'PENDING',
    });
    expect(res.body.certification.rejection_note).toBeNull();
  });
});

// ── Fixer lists own certifications ──────────────────────────────────────────

describe('GET /api/users/me/certifications', () => {
  it('fixer lists own certifications → 200', async () => {
    __setUid('fixer-uid');
    const fixer = await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@test.com', full_name: 'Test Fixer' });

    await prisma.certification.create({
      data: { fixer_id: fixer.id, category: 'ELECTRICITY', title: 'Electrician Cert', document_url: 'https://example.com/cert.pdf' },
    });
    await prisma.certification.create({
      data: { fixer_id: fixer.id, category: 'PLUMBING', title: 'Plumber Cert', document_url: 'https://example.com/cert2.pdf', status: 'APPROVED' },
    });

    const res = await request(app)
      .get('/api/users/me/certifications')
      .set('Authorization', FIXER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.certifications).toHaveLength(2);
  });
});

// ── Admin certification routes ──────────────────────────────────────────────

describe('GET /api/admin/pending-certifications', () => {
  it('admin lists pending certifications → 200', async () => {
    __setUid('admin-uid');
    await createTestUser({ firebase_uid: 'admin-uid', email: 'admin@test.com', full_name: 'Admin', is_admin: true });

    __setUid('fixer-uid');
    const fixer = await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@test.com', full_name: 'Test Fixer' });

    await prisma.certification.create({
      data: { fixer_id: fixer.id, category: 'ELECTRICITY', title: 'Electrician Cert', document_url: 'https://example.com/cert.pdf' },
    });

    __setUid('admin-uid');
    const res = await request(app)
      .get('/api/admin/pending-certifications')
      .set('Authorization', ADMIN_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.certifications).toHaveLength(1);
    expect(res.body.certifications[0].fixer).toBeDefined();
    expect(typeof res.body.total).toBe('number');
  });

  it('non-admin cannot access admin cert routes → 403', async () => {
    __setUid('fixer-uid');
    await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@test.com', full_name: 'Test Fixer' });

    const res = await request(app)
      .get('/api/admin/pending-certifications')
      .set('Authorization', FIXER_AUTH);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/admin/certifications/:id/review', () => {
  let certId: string;

  beforeEach(async () => {
    __setUid('admin-uid');
    await createTestUser({ firebase_uid: 'admin-uid', email: 'admin@test.com', full_name: 'Admin', is_admin: true });

    __setUid('fixer-uid');
    const fixer = await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@test.com', full_name: 'Test Fixer' });

    const cert = await prisma.certification.create({
      data: { fixer_id: fixer.id, category: 'ELECTRICITY', title: 'Electrician Cert', document_url: 'https://example.com/cert.pdf' },
    });
    certId = cert.id;
  });

  it('admin approves cert → 200, status becomes APPROVED', async () => {
    __setUid('admin-uid');
    const res = await request(app)
      .post(`/api/admin/certifications/${certId}/review`)
      .set('Authorization', ADMIN_AUTH)
      .send({ action: 'approve' });

    expect(res.status).toBe(200);

    const cert = await prisma.certification.findUnique({ where: { id: certId } });
    expect(cert?.status).toBe('APPROVED');
    expect(cert?.reviewed_at).not.toBeNull();
    expect(cert?.reviewed_by).not.toBeNull();
  });

  it('admin rejects cert with note → 200, status becomes REJECTED', async () => {
    __setUid('admin-uid');
    const res = await request(app)
      .post(`/api/admin/certifications/${certId}/review`)
      .set('Authorization', ADMIN_AUTH)
      .send({ action: 'reject', rejection_note: 'Document is illegible' });

    expect(res.status).toBe(200);

    const cert = await prisma.certification.findUnique({ where: { id: certId } });
    expect(cert?.status).toBe('REJECTED');
    expect(cert?.rejection_note).toBe('Document is illegible');
  });

  it('admin rejects cert without rejection_note → 200', async () => {
    __setUid('admin-uid');
    const res = await request(app)
      .post(`/api/admin/certifications/${certId}/review`)
      .set('Authorization', ADMIN_AUTH)
      .send({ action: 'reject' });

    expect(res.status).toBe(200);

    const cert = await prisma.certification.findUnique({ where: { id: certId } });
    expect(cert?.status).toBe('REJECTED');
    expect(cert?.rejection_note).toBeNull();
  });

  it('admin reviews non-existent cert → 404', async () => {
    __setUid('admin-uid');
    const res = await request(app)
      .post('/api/admin/certifications/00000000-0000-0000-0000-000000000000/review')
      .set('Authorization', ADMIN_AUTH)
      .send({ action: 'approve' });

    expect(res.status).toBe(404);
  });

  it('non-admin cannot review certifications → 403', async () => {
    __setUid('fixer-uid');
    const res = await request(app)
      .post(`/api/admin/certifications/${certId}/review`)
      .set('Authorization', FIXER_AUTH)
      .send({ action: 'approve' });

    expect(res.status).toBe(403);
  });
});

// ── Public profile shows only APPROVED certs ────────────────────────────────

describe('GET /api/users/:id — certifications on public profile', () => {
  it('public profile shows only APPROVED certs', async () => {
    __setUid('fixer-uid');
    const fixer = await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@test.com', full_name: 'Test Fixer' });

    // Create one APPROVED and one PENDING cert
    await prisma.certification.create({
      data: { fixer_id: fixer.id, category: 'ELECTRICITY', title: 'Approved Cert', document_url: 'https://example.com/cert.pdf', status: 'APPROVED' },
    });
    await prisma.certification.create({
      data: { fixer_id: fixer.id, category: 'PLUMBING', title: 'Pending Cert', document_url: 'https://example.com/cert2.pdf', status: 'PENDING' },
    });

    const res = await request(app)
      .get(`/api/users/${fixer.id}`)
      .set('Authorization', FIXER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.user.certifications).toHaveLength(1);
    expect(res.body.user.certifications[0].category).toBe('ELECTRICITY');
  });
});

// ── Bids include certified_categories ───────────────────────────────────────

describe('GET /api/tasks/:id/bids — certified_categories enrichment', () => {
  it('bids include certified_categories array', async () => {
    __setUid('requester-uid');
    await createTestUser({ firebase_uid: 'requester-uid', email: 'requester@test.com', full_name: 'Test Requester' });

    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', REQUESTER_AUTH)
      .send({
        title: 'Fix wiring',
        description: 'Electrical work needed',
        category: 'ELECTRICITY',
        general_location_name: 'Tel Aviv',
        exact_address: '123 Test St',
        lat: 32.08,
        lng: 34.78,
      });
    const taskId = taskRes.body.task.id;

    // Create fixer with approved cert
    __setUid('fixer-uid');
    const fixer = await createTestUser({ firebase_uid: 'fixer-uid', email: 'fixer@test.com', full_name: 'Test Fixer' });
    await prisma.certification.create({
      data: { fixer_id: fixer.id, category: 'ELECTRICITY', title: 'Electrician Cert', document_url: 'https://example.com/cert.pdf', status: 'APPROVED' },
    });

    // Fixer places a bid
    await request(app)
      .post(`/api/tasks/${taskId}/bids`)
      .set('Authorization', FIXER_AUTH)
      .send({ offered_price: 150, description: 'I can fix this' });

    // Requester fetches bids
    __setUid('requester-uid');
    const res = await request(app)
      .get(`/api/tasks/${taskId}/bids`)
      .set('Authorization', REQUESTER_AUTH);

    expect(res.status).toBe(200);
    expect(res.body.bids).toHaveLength(1);
    expect(res.body.bids[0].certified_categories).toEqual(['ELECTRICITY']);
  });
});
