export const buildDateRangeFilter = (startDate?: string, endDate?: string) => {
  if (!startDate && !endDate) return undefined;
  return {
    ...(startDate && { gte: new Date(startDate) }),
    ...(endDate && { lte: new Date(endDate) }),
  };
};
