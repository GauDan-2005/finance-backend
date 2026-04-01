import { Response } from 'express';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    statusCode: number,
    message: string,
    data?: T,
    meta?: PaginationMeta,
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      ...(data !== undefined && { data }),
      ...(meta && { meta }),
    });
  }

  static error(
    res: Response,
    statusCode: number,
    message: string,
    errors?: Record<string, string>,
  ): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors && { errors }),
    });
  }
}
