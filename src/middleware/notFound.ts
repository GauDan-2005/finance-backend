import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';

export const notFound = (_req: Request, _res: Response, next: NextFunction): void => {
  next(ApiError.notFound('The requested resource was not found'));
};
