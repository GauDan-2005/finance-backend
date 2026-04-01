import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { dashboardService } from './dashboard.service.js';

export const dashboardController = {
  getSummary: asyncHandler(async (_req: Request, res: Response) => {
    const summary = await dashboardService.getSummary();
    ApiResponse.success(res, StatusCodes.OK, 'Summary retrieved successfully', summary);
  }),

  getCategorySummary: asyncHandler(async (_req: Request, res: Response) => {
    const categories = await dashboardService.getCategorySummary();
    ApiResponse.success(res, StatusCodes.OK, 'Category summary retrieved successfully', categories);
  }),

  getTrends: asyncHandler(async (req: Request, res: Response) => {
    const period = (req.query.period as string) === 'weekly' ? 'weekly' : 'monthly';
    const months = parseInt(req.query.months as string) || 6;
    const trends = await dashboardService.getTrends(period, months);
    ApiResponse.success(res, StatusCodes.OK, 'Trends retrieved successfully', trends);
  }),

  getRecentActivity: asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const records = await dashboardService.getRecentActivity(limit);
    ApiResponse.success(res, StatusCodes.OK, 'Recent activity retrieved successfully', records);
  }),
};
