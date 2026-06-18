import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError.js';
import env from '../config/env.js';

export function authenticateToken(req, res, next) {
  let token = req.cookies?.token;
  
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Token missing', 401));
  }

  jwt.verify(token, env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new AppError('Invalid or expired token', 403));
    }

    req.user = decoded;
    next();
  });
}