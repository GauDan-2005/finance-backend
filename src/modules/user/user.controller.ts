import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { userService } from './user.service.js';
import { listUsersQuerySchema } from './user.schema.js';

export const userController = {
  listUsers: asyncHandler(async (req: Request, res: Response) => {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await userService.listUsers(query);
    ApiResponse.success(
      res,
      StatusCodes.OK,
      'Users retrieved successfully',
      result.data,
      result.meta,
    );
  }),

  getUserById: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const user = await userService.getUserById(id);
    ApiResponse.success(res, StatusCodes.OK, 'User retrieved successfully', user);
  }),

  updateUser: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const user = await userService.updateUser(id, req.body, req.user!.id);
    ApiResponse.success(res, StatusCodes.OK, 'User updated successfully', user);
  }),

  deleteUser: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await userService.deleteUser(id, req.user!.id);
    ApiResponse.success(res, StatusCodes.OK, result.message);
  }),
};
