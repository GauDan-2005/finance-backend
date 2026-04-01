import { PrismaClient } from '@prisma/client';
import { config } from './env.js';

const prisma = new PrismaClient({
  log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
});

export default prisma;
