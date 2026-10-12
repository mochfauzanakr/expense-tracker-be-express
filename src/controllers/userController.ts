import { Request, Response } from 'express';
import * as userService from '../services/userService.js';

export async function register(req: Request, res: Response): Promise<void> {
  const data = await userService.registerUser(req.body);
  res.status(201).json({ message: 'User registered successfully', data });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { token, user } = await userService.loginUser(req.body);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    message: 'Logged in successfully',
    token,
    user,
  });
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const data = await userService.getUserById(req.params.id as string, req.user!.id);
  res.json({ data });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const data = await userService.updateUser(req.params.id as string, req.user!.id, req.body);
  res.json({ data });
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const result = await userService.deactivateUser(req.params.id as string, req.user!.id);
  res.json(result);
}
