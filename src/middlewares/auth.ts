import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';
import env from '../config/env.js';

interface JwtPayload {
  id: string;
  name: string;
  email: string;
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  let token = req.cookies?.token;
  
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Token missing', 401));
  }

  jwt.verify(token, env.JWT_SECRET, (err: jwt.VerifyErrors | null, decoded: any) => {
    if (err || !decoded) {
      return next(new AppError('Invalid or expired token', 403));
    }

    req.user = decoded as JwtPayload;
    next();
  });
}