import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const TEST_DATABASE_URL = 'file:./test.db';

// Set test environment variables before anything else
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';

const prisma = new PrismaClient({
  datasources: { db: { url: TEST_DATABASE_URL } },
});

beforeAll(async () => {
  // Run migrations on test database
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
