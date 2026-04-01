import request from 'supertest';
import app from '../src/app.js';
import { prisma } from './setup.js';
import { createTestUser, authHeader } from './helpers.js';

let adminToken: string;
let analystToken: string;
let viewerToken: string;
let viewerId: string;

beforeEach(async () => {
  await prisma.financialRecord.deleteMany();
  await prisma.user.deleteMany();

  const admin = await createTestUser('admin@test.com', 'Admin', 'ADMIN');
  const analyst = await createTestUser('analyst@test.com', 'Analyst', 'ANALYST');
  const viewer = await createTestUser('viewer@test.com', 'Viewer', 'VIEWER');

  adminToken = admin.token;
  analystToken = analyst.token;
  viewerToken = viewer.token;
  viewerId = viewer.user.id;
});

describe('User Management Endpoints', () => {
  describe('Authorization', () => {
    it('should allow admin to list users', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
    });

    it('should deny analyst access', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set(authHeader(analystToken));

      expect(res.status).toBe(403);
    });

    it('should deny viewer access', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set(authHeader(viewerToken));

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/users', () => {
    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/v1/users?page=1&limit=2')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(3);
      expect(res.body.meta.totalPages).toBe(2);
    });

    it('should filter by role', async () => {
      const res = await request(app)
        .get('/api/v1/users?role=ADMIN')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].role).toBe('ADMIN');
    });

    it('should search by name', async () => {
      const res = await request(app)
        .get('/api/v1/users?search=Analyst')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('should update user role', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${viewerId}`)
        .set(authHeader(adminToken))
        .send({ role: 'ANALYST' });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('ANALYST');
    });

    it('should prevent self-deactivation', async () => {
      const adminUser = await prisma.user.findFirst({ where: { email: 'admin@test.com' } });
      const res = await request(app)
        .patch(`/api/v1/users/${adminUser!.id}`)
        .set(authHeader(adminToken))
        .send({ isActive: false });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .patch('/api/v1/users/nonexistent-id')
        .set(authHeader(adminToken))
        .send({ name: 'New Name' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should deactivate user', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${viewerId}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);

      const user = await prisma.user.findUnique({ where: { id: viewerId } });
      expect(user!.isActive).toBe(false);
    });

    it('should prevent self-deletion', async () => {
      const adminUser = await prisma.user.findFirst({ where: { email: 'admin@test.com' } });
      const res = await request(app)
        .delete(`/api/v1/users/${adminUser!.id}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(400);
    });
  });
});
