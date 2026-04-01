import request from 'supertest';
import app from '../src/app.js';

export async function createTestUser(
  email: string,
  name: string,
  role: 'VIEWER' | 'ANALYST' | 'ADMIN' = 'VIEWER',
) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'password123', name, role });
  return {
    user: res.body.data.user,
    token: res.body.data.token as string,
  };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
