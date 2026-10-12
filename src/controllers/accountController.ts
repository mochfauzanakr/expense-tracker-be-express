import { Request, Response } from 'express';
import * as accountService from '../services/accountService.js';

export async function getAccounts(req: Request, res: Response): Promise<void> {
  const data = await accountService.getAccounts(req.user!.id);
  res.json({ data });
}

export async function getAccount(req: Request, res: Response): Promise<void> {
  const data = await accountService.getAccountById(req.params.id as string, req.user!.id);
  res.json({ data });
}

export async function createAccount(req: Request, res: Response): Promise<void> {
  const data = await accountService.createAccount(req.user!.id, req.body);
  res.status(201).json({ data });
}

export async function updateAccount(req: Request, res: Response): Promise<void> {
  const data = await accountService.updateAccount(req.params.id as string, req.user!.id, req.body);
  res.json({ data });
}

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  const result = await accountService.deleteAccount(req.params.id as string, req.user!.id);
  res.json(result);
}
