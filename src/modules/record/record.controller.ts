import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { recordService } from './record.service.js';
import { listRecordsQuerySchema } from './record.schema.js';

export const recordController = {
  createRecord: asyncHandler(async (req: Request, res: Response) => {
    const record = await recordService.createRecord(req.user!.id, req.body);
    ApiResponse.success(res, StatusCodes.CREATED, 'Record created successfully', record);
  }),

  listRecords: asyncHandler(async (req: Request, res: Response) => {
    const query = listRecordsQuerySchema.parse(req.query);
    const result = await recordService.listRecords(query);
    ApiResponse.success(
      res,
      StatusCodes.OK,
      'Records retrieved successfully',
      result.data,
      result.meta,
    );
  }),

  getRecordById: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const record = await recordService.getRecordById(id);
    ApiResponse.success(res, StatusCodes.OK, 'Record retrieved successfully', record);
  }),

  updateRecord: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const record = await recordService.updateRecord(id, req.body);
    ApiResponse.success(res, StatusCodes.OK, 'Record updated successfully', record);
  }),

  deleteRecord: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await recordService.deleteRecord(id);
    ApiResponse.success(res, StatusCodes.OK, result.message);
  }),
};
