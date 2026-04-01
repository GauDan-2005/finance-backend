import request from 'supertest';
import app from '../src/app.js';
import { prisma } from './setup.js';
import { createTestUser, authHeader } from './helpers.js';

let adminToken: string;
let viewerToken: string;

beforeEach(async () => {
  await prisma.financialRecord.deleteMany();
  await prisma.user.deleteMany();

  const admin = await createTestUser('admin@test.com', 'Admin', 'ADMIN');
  const viewer = await createTestUser('viewer@test.com', 'Viewer', 'VIEWER');

  adminToken = admin.token;
  viewerToken = viewer.token;

  // Seed test records
  await request(app)
    .post('/api/v1/records')
    .set(authHeader(adminToken))
    .send({ amount: 5000, type: 'INCOME', category: 'Salary', date: '2026-03-01T00:00:00.000Z' });

  await request(app)
    .post('/api/v1/records')
    .set(authHeader(adminToken))
    .send({ amount: 3000, type: 'INCOME', category: 'Freelance', date: '2026-03-15T00:00:00.000Z' });

  await request(app)
    .post('/api/v1/records')
    .set(authHeader(adminToken))
    .send({ amount: 1500, type: 'EXPENSE', category: 'Rent', date: '2026-03-05T00:00:00.000Z' });

  await request(app)
    .post('/api/v1/records')
    .set(authHeader(adminToken))
    .send({ amount: 200, type: 'EXPENSE', category: 'Food', date: '2026-03-10T00:00:00.000Z' });
});

describe('Dashboard Endpoints', () => {
  describe('GET /api/v1/dashboard/summary', () => {
    it('should return correct totals', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.totalIncome).toBe(8000);
      expect(res.body.data.totalExpenses).toBe(1700);
      expect(res.body.data.netBalance).toBe(6300);
      expect(res.body.data.totalRecords).toBe(4);
    });

    it('should allow viewer access', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set(authHeader(viewerToken));

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/dashboard/summary');
      expect(res.status).toBe(401);
    });

    it('should handle empty database', async () => {
      await prisma.financialRecord.deleteMany();

      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.totalIncome).toBe(0);
      expect(res.body.data.totalExpenses).toBe(0);
      expect(res.body.data.netBalance).toBe(0);
    });
  });

  describe('GET /api/v1/dashboard/category-summary', () => {
    it('should group by category and type', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/category-summary')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const salary = res.body.data.find(
        (c: { category: string; type: string }) => c.category === 'Salary' && c.type === 'INCOME',
      );
      expect(salary).toBeDefined();
      expect(salary.totalAmount).toBe(5000);
    });
  });

  describe('GET /api/v1/dashboard/trends', () => {
    it('should return monthly trends', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/trends?period=monthly')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const march = res.body.data.find((t: { period: string }) => t.period === '2026-03');
      expect(march).toBeDefined();
      expect(march.income).toBe(8000);
      expect(march.expense).toBe(1700);
      expect(march.net).toBe(6300);
    });

    it('should return weekly trends', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/trends?period=weekly')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/dashboard/recent', () => {
    it('should return recent records with limit', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/recent?limit=2')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('should return records in descending date order', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/recent')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      const dates = res.body.data.map((r: { date: string }) => new Date(r.date).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
      }
    });

    it('should exclude soft-deleted records', async () => {
      // Soft delete a record
      const allRecords = await request(app)
        .get('/api/v1/records')
        .set(authHeader(adminToken));
      const firstId = allRecords.body.data[0].id;

      await request(app)
        .delete(`/api/v1/records/${firstId}`)
        .set(authHeader(adminToken));

      const res = await request(app)
        .get('/api/v1/dashboard/recent')
        .set(authHeader(adminToken));

      const ids = res.body.data.map((r: { id: string }) => r.id);
      expect(ids).not.toContain(firstId);
    });
  });
});
