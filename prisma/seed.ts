import { PrismaClient, Role, TransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const categories = {
  income: ['Salary', 'Freelance', 'Investments', 'Rental Income', 'Bonus'],
  expense: ['Food', 'Transport', 'Utilities', 'Entertainment', 'Healthcare', 'Education', 'Rent'],
};

function randomDate(monthsBack: number): Date {
  const now = new Date();
  const past = new Date(now);
  past.setMonth(past.getMonth() - monthsBack);
  const diff = now.getTime() - past.getTime();
  return new Date(past.getTime() + Math.random() * diff);
}

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Seed users (idempotent with upsert)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: passwordHash,
      name: 'Admin User',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'analyst@example.com' },
    update: {},
    create: {
      email: 'analyst@example.com',
      password: passwordHash,
      name: 'Analyst User',
      role: Role.ANALYST,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'viewer@example.com' },
    update: {},
    create: {
      email: 'viewer@example.com',
      password: passwordHash,
      name: 'Viewer User',
      role: Role.VIEWER,
      isActive: true,
    },
  });

  // Seed financial records (only if none exist)
  const existingCount = await prisma.financialRecord.count();
  if (existingCount > 0) {
    // eslint-disable-next-line no-console
    console.log(`Skipping record seed: ${existingCount} records already exist`);
    return;
  }

  const records = [];

  // Generate 20 records spread across 3 months
  for (let i = 0; i < 20; i++) {
    const isIncome = Math.random() > 0.4; // 60% income, 40% expense
    const type = isIncome ? TransactionType.INCOME : TransactionType.EXPENSE;
    const categoryList = isIncome ? categories.income : categories.expense;
    const category = categoryList[Math.floor(Math.random() * categoryList.length)]!;
    const amount = isIncome ? randomAmount(500, 10000) : randomAmount(20, 3000);

    records.push({
      amount,
      type,
      category,
      date: randomDate(3),
      description: `${type === TransactionType.INCOME ? 'Received' : 'Paid'} - ${category}`,
      userId: admin.id,
      isDeleted: false,
    });
  }

  await prisma.financialRecord.createMany({ data: records });

  // eslint-disable-next-line no-console
  console.log('Seed completed: 3 users + 20 financial records');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
