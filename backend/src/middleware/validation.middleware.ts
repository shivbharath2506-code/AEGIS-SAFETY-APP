import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { errorResponse } from '../utils/response';

export const validateRequest = (schema: {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      return next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const issues = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }));
        return errorResponse(res, 'VALIDATION_FAILED', 'Input validation failed', 422, issues);
      }
      return errorResponse(res, 'BAD_REQUEST', 'Invalid request structure', 400);
    }
  };
};
