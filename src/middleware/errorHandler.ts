import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/env.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }

  // Prisma known request errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as Error & { code: string };
    if (prismaErr.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: 'A record with this value already exists',
      });
      return;
    }
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    const zodErr = err as Error & { issues: Array<{ path: (string | number)[]; message: string }> };
    const errors: Record<string, string> = {};
    for (const issue of zodErr.issues) {
      const key = issue.path.join('.');
      errors[key] = issue.message;
    }
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
    return;
  }

  // Unknown errors
  if (config.nodeEnv === 'development') {
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', err);
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
