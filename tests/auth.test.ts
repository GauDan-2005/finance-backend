import request from 'supertest';
import app from '../src/app.js';
import { prisma } from './setup.js';

beforeEach(async () => {
  await prisma.financialRecord.deleteMany();
  await prisma.user.deleteMany();
});

describe('Auth Endpoints', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com', password: 'password123', name: 'Test User' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@example.com');
      expect(res.body.data.user.role).toBe('VIEWER');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'dup@example.com', password: 'password123', name: 'User' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'dup@example.com', password: 'password123', name: 'User 2' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'not-email', password: 'password123', name: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body.errors.email).toBeDefined();
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com', password: '12', name: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body.errors.password).toBeDefined();
    });

    it('should reject missing fields', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'login@example.com', password: 'password123', name: 'Login User' });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('login@example.com');
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nope@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should reject inactive user', async () => {
      await prisma.user.updateMany({
        where: { email: 'login@example.com' },
        data: { isActive: false },
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@example.com', password: 'password123' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return profile with valid token', async () => {
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'me@example.com', password: 'password123', name: 'Me User' });
      const token = registerRes.body.data.token;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('me@example.com');
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
    });

    it('should reject with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });
});
