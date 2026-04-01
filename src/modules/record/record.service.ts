import { Prisma } from '@prisma/client';
import prisma from '../../config/database.js';
import { ApiError } from '../../utils/ApiError.js';
import { buildPaginationParams, buildPaginationMeta } from '../../utils/pagination.js';
import { buildDateRangeFilter } from '../../utils/filters.js';
import { CreateRecordInput, UpdateRecordInput, ListRecordsQuery } from './record.schema.js';

const recordInclude = {
  user: {
    select: { id: true, name: true, email: true },
  },
} satisfies Prisma.FinancialRecordInclude;

export const recordService = {
  async createRecord(userId: string, data: CreateRecordInput) {
    const record = await prisma.financialRecord.create({
      data: {
        amount: data.amount,
        type: data.type,
        category: data.category,
        date: new Date(data.date),
        description: data.description,
        userId,
      },
      include: recordInclude,
    });

    return record;
  },

  async listRecords(query: ListRecordsQuery) {
    const { page, limit, type, category, startDate, endDate, search, sortBy, sortOrder } = query;
    const { skip, take } = buildPaginationParams(page, limit);
    const dateFilter = buildDateRangeFilter(startDate, endDate);

    const where: Prisma.FinancialRecordWhereInput = {
      isDeleted: false,
      ...(type && { type }),
      ...(category && { category }),
      ...(search && { description: { contains: search } }),
      ...(dateFilter && { date: dateFilter }),
    };

    const [records, total] = await Promise.all([
      prisma.financialRecord.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: recordInclude,
      }),
      prisma.financialRecord.count({ where }),
    ]);

    return {
      data: records,
      meta: buildPaginationMeta(total, page, limit),
    };
  },

  async getRecordById(id: string) {
    const record = await prisma.financialRecord.findUnique({
      where: { id },
      include: recordInclude,
    });

    if (!record || record.isDeleted) {
      throw ApiError.notFound('Record not found');
    }

    return record;
  },

  async updateRecord(id: string, data: UpdateRecordInput) {
    const record = await prisma.financialRecord.findUnique({ where: { id } });

    if (!record || record.isDeleted) {
      throw ApiError.notFound('Record not found');
    }

    const updated = await prisma.financialRecord.update({
      where: { id },
      data: {
        ...data,
        ...(data.date && { date: new Date(data.date) }),
      },
      include: recordInclude,
    });

    return updated;
  },

  async deleteRecord(id: string) {
    const record = await prisma.financialRecord.findUnique({ where: { id } });

    if (!record || record.isDeleted) {
      throw ApiError.notFound('Record not found');
    }

    await prisma.financialRecord.update({
      where: { id },
      data: { isDeleted: true },
    });

    return { message: 'Record deleted successfully' };
  },
};
