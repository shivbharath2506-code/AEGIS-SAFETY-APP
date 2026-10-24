import { Response } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
  timestamp: string;
}

export const successResponse = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    ...(message ? { message } : {}),
    data,
    timestamp: new Date().toISOString()
  };
  return res.status(statusCode).json(payload);
};

export const errorResponse = (
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: any
): Response => {
  const payload: ApiResponse<null> = {
    success: false,
    message,
    error: {
      code,
      ...(details !== undefined ? { details } : {})
    },
    timestamp: new Date().toISOString()
  };
  return res.status(statusCode).json(payload);
};
