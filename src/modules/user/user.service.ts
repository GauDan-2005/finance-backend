import { Prisma } from '@prisma/client';
import prisma from '../../config/database.js';
import { ApiError } from '../../utils/ApiError.js';
import { buildPaginationParams, buildPaginationMeta } from '../../utils/pagination.js';
import { UpdateUserInput, ListUsersQuery } from './user.schema.js';

const userSelectFields = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const userService = {
  async listUsers(query: ListUsersQuery) {
    const { page, limit, role, isActive, search } = query;
    const { skip, take } = buildPaginationParams(page, limit);

    const where: Prisma.UserWhereInput = {
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [{ name: { contains: search } }, { email: { contains: search } }],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: userSelectFields,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: buildPaginationMeta(total, page, limit),
    };
  },

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: userSelectFields,
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user;
  },

  async updateUser(id: string, data: UpdateUserInput, requestingUserId: string) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Prevent admin from deactivating themselves
    if (id === requestingUserId && data.isActive === false) {
      throw ApiError.badRequest('You cannot deactivate your own account');
    }

    // Prevent admin from changing their own role
    if (id === requestingUserId && data.role) {
      throw ApiError.badRequest('You cannot change your own role');
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: userSelectFields,
    });

    return updated;
  },

  async deleteUser(id: string, requestingUserId: string) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (id === requestingUserId) {
      throw ApiError.badRequest('You cannot delete your own account');
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'User deactivated successfully' };
  },
};
