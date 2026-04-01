export const buildPaginationParams = (page: number, limit: number) => ({
  skip: (page - 1) * limit,
  take: limit,
});

export const buildPaginationMeta = (total: number, page: number, limit: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
