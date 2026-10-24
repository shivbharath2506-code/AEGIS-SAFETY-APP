import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';
import { logger } from '../utils/logger';
import { config } from '../config';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  logger.error('Unhandled server exception:', {
    message: err.message,
    path: req.path,
    method: req.method
  });

  const statusCode = err.status || err.statusCode || 500;
  const message =
    config.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected internal error occurred. Please try again.'
      : err.message || 'Internal server error';

  return errorResponse(res, err.code || 'INTERNAL_SERVER_ERROR', message, statusCode);
};

export const notFoundHandler = (req: Request, res: Response): any => {
  return errorResponse(
    res,
    'ROUTE_NOT_FOUND',
    `Resource not found for ${req.method} ${req.originalUrl}`,
    404
  );
};
