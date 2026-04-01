import { Prisma } from '@prisma/client';
import prisma from '../../config/database.js';

const baseWhere: Prisma.FinancialRecordWhereInput = { isDeleted: false };

export const dashboardService = {
  async getSummary() {
    const [incomeAgg, expenseAgg, totalRecords] = await Promise.all([
      prisma.financialRecord.aggregate({
        where: { ...baseWhere, type: 'INCOME' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.financialRecord.aggregate({
        where: { ...baseWhere, type: 'EXPENSE' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.financialRecord.count({ where: baseWhere }),
    ]);

    const totalIncome = incomeAgg._sum.amount || 0;
    const totalExpenses = expenseAgg._sum.amount || 0;

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netBalance: Math.round((totalIncome - totalExpenses) * 100) / 100,
      totalRecords,
      incomeCount: incomeAgg._count,
      expenseCount: expenseAgg._count,
    };
  },

  async getCategorySummary() {
    const categoryTotals = await prisma.financialRecord.groupBy({
      by: ['category', 'type'],
      where: baseWhere,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    return categoryTotals.map((item) => ({
      category: item.category,
      type: item.type,
      totalAmount: Math.round((item._sum.amount || 0) * 100) / 100,
      count: item._count,
    }));
  },

  async getTrends(period: 'monthly' | 'weekly' = 'monthly', months: number = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const records = await prisma.financialRecord.findMany({
      where: {
        ...baseWhere,
        date: { gte: startDate },
      },
      select: { amount: true, type: true, date: true },
      orderBy: { date: 'asc' },
    });

    const grouped = new Map<string, { income: number; expense: number }>();

    for (const record of records) {
      const date = new Date(record.date);
      let key: string;

      if (period === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        // Weekly: use Monday of the week as key
        const dayOfWeek = date.getDay();
        const monday = new Date(date);
        monday.setDate(date.getDate() - ((dayOfWeek + 6) % 7));
        key = monday.toISOString().split('T')[0]!;
      }

      const existing = grouped.get(key) || { income: 0, expense: 0 };
      if (record.type === 'INCOME') {
        existing.income += record.amount;
      } else {
        existing.expense += record.amount;
      }
      grouped.set(key, existing);
    }

    return Array.from(grouped.entries()).map(([periodKey, data]) => ({
      period: periodKey,
      income: Math.round(data.income * 100) / 100,
      expense: Math.round(data.expense * 100) / 100,
      net: Math.round((data.income - data.expense) * 100) / 100,
    }));
  },

  async getRecentActivity(limit: number = 10) {
    const records = await prisma.financialRecord.findMany({
      where: baseWhere,
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return records;
  },
};
