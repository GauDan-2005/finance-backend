import request from 'supertest';
import app from '../src/app.js';
import { prisma } from './setup.js';
import { createTestUser, authHeader } from './helpers.js';

let adminToken: string;
let analystToken: string;
let viewerToken: string;
let testRecordId: string;

beforeEach(async () => {
  await prisma.financialRecord.deleteMany();
  await prisma.user.deleteMany();

  const admin = await createTestUser('admin@test.com', 'Admin', 'ADMIN');
  const analyst = await createTestUser('analyst@test.com', 'Analyst', 'ANALYST');
  const viewer = await createTestUser('viewer@test.com', 'Viewer', 'VIEWER');

  adminToken = admin.token;
  analystToken = analyst.token;
  viewerToken = viewer.token;

  // Create a test record
  const recordRes = await request(app)
    .post('/api/v1/records')
    .set(authHeader(adminToken))
    .send({
      amount: 1000,
      type: 'INCOME',
      category: 'Salary',
      date: '2026-03-15T00:00:00.000Z',
      description: 'Test salary',
    });
  testRecordId = recordRes.body.data.id;
});

describe('Financial Records Endpoints', () => {
  describe('Authorization', () => {
    it('should allow admin to create records', async () => {
      const res = await request(app)
        .post('/api/v1/records')
        .set(authHeader(adminToken))
        .send({
          amount: 500,
          type: 'EXPENSE',
          category: 'Food',
          date: '2026-03-20T00:00:00.000Z',
        });

      expect(res.status).toBe(201);
    });

    it('should deny analyst from creating records', async () => {
      const res = await request(app)
        .post('/api/v1/records')
        .set(authHeader(analystToken))
        .send({
          amount: 500,
          type: 'EXPENSE',
          category: 'Food',
          date: '2026-03-20T00:00:00.000Z',
        });

      expect(res.status).toBe(403);
    });

    it('should deny viewer from reading records', async () => {
      const res = await request(app)
        .get('/api/v1/records')
        .set(authHeader(viewerToken));

      expect(res.status).toBe(403);
    });

    it('should allow analyst to read records', async () => {
      const res = await request(app)
        .get('/api/v1/records')
        .set(authHeader(analystToken));

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/records', () => {
    it('should create record with valid data', async () => {
      const res = await request(app)
        .post('/api/v1/records')
        .set(authHeader(adminToken))
        .send({
          amount: 2500.50,
          type: 'INCOME',
          category: 'Freelance',
          date: '2026-03-10T00:00:00.000Z',
          description: 'Client project',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.amount).toBe(2500.50);
      expect(res.body.data.user).toBeDefined();
    });

    it('should reject negative amount', async () => {
      const res = await request(app)
        .post('/api/v1/records')
        .set(authHeader(adminToken))
        .send({ amount: -100, type: 'INCOME', category: 'Test', date: '2026-03-10T00:00:00.000Z' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid type', async () => {
      const res = await request(app)
        .post('/api/v1/records')
        .set(authHeader(adminToken))
        .send({ amount: 100, type: 'INVALID', category: 'Test', date: '2026-03-10T00:00:00.000Z' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/records', () => {
    it('should list records with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/records?page=1&limit=5')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
    });

    it('should filter by type', async () => {
      await request(app)
        .post('/api/v1/records')
        .set(authHeader(adminToken))
        .send({ amount: 200, type: 'EXPENSE', category: 'Food', date: '2026-03-20T00:00:00.000Z' });

      const res = await request(app)
        .get('/api/v1/records?type=EXPENSE')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      for (const record of res.body.data) {
        expect(record.type).toBe('EXPENSE');
      }
    });

    it('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/v1/records?startDate=2026-03-01T00:00:00.000Z&endDate=2026-03-31T23:59:59.999Z')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
    });

    it('should search by description', async () => {
      const res = await request(app)
        .get('/api/v1/records?search=salary')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
    });

    it('should sort by amount ascending', async () => {
      await request(app)
        .post('/api/v1/records')
        .set(authHeader(adminToken))
        .send({ amount: 50, type: 'EXPENSE', category: 'Food', date: '2026-03-20T00:00:00.000Z' });

      const res = await request(app)
        .get('/api/v1/records?sortBy=amount&sortOrder=asc')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      const amounts = res.body.data.map((r: { amount: number }) => r.amount);
      for (let i = 1; i < amounts.length; i++) {
        expect(amounts[i]).toBeGreaterThanOrEqual(amounts[i - 1]);
      }
    });
  });

  describe('PATCH /api/v1/records/:id', () => {
    it('should update record', async () => {
      const res = await request(app)
        .patch(`/api/v1/records/${testRecordId}`)
        .set(authHeader(adminToken))
        .send({ amount: 1500 });

      expect(res.status).toBe(200);
      expect(res.body.data.amount).toBe(1500);
    });

    it('should return 404 for non-existent record', async () => {
      const res = await request(app)
        .patch('/api/v1/records/nonexistent-id')
        .set(authHeader(adminToken))
        .send({ amount: 1500 });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/records/:id', () => {
    it('should soft delete record', async () => {
      const res = await request(app)
        .delete(`/api/v1/records/${testRecordId}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);

      // Verify soft-deleted record is excluded from list
      const listRes = await request(app)
        .get('/api/v1/records')
        .set(authHeader(adminToken));

      const ids = listRes.body.data.map((r: { id: string }) => r.id);
      expect(ids).not.toContain(testRecordId);
    });

    it('should return 404 for already deleted record', async () => {
      await request(app)
        .delete(`/api/v1/records/${testRecordId}`)
        .set(authHeader(adminToken));

      const res = await request(app)
        .delete(`/api/v1/records/${testRecordId}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(404);
    });
  });
});
