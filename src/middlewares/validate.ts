import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema } from 'zod';
import AppError from '../utils/AppError.js';

export const validateBody = (schema: ZodSchema): RequestHandler => (req: Request, res: Response, next: NextFunction): void => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errorMsg = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    return next(new AppError(errorMsg, 400));
  }
  req.body = result.data;
  next();
};

export const validateQuery = (schema: ZodSchema): RequestHandler => (req: Request, res: Response, next: NextFunction): void => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const errorMsg = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    return next(new AppError(errorMsg, 400));
  }
  req.query = result.data as any;
  next();
};
