import { Request, Response } from 'express';
import * as transactionService from '../services/transactionService.js';

export async function getTransactions(req: Request, res: Response): Promise<void> {
  const data = await transactionService.getTransactions(req.user!.id);
  res.json({ data });
}

export async function getTransaction(req: Request, res: Response): Promise<void> {
  const data = await transactionService.getTransactionById(req.params.id as string, req.user!.id);
  res.json({ data });
}

export async function createTransaction(req: Request, res: Response): Promise<void> {
  const data = await transactionService.createTransaction(req.user!.id, req.body);
  res.status(201).json({ data });
}

export async function updateTransaction(req: Request, res: Response): Promise<void> {
  const data = await transactionService.updateTransaction(req.params.id as string, req.user!.id, req.body);
  res.json({ data });
}

export async function deleteTransaction(req: Request, res: Response): Promise<void> {
  const result = await transactionService.deleteTransaction(req.params.id as string, req.user!.id);
  res.json(result);
}

export async function getHighestExpenses(req: Request, res: Response): Promise<void> {
  const data = await transactionService.getHighestExpenses(req.user!.id);
  res.json({ data });
}

export async function getFilteredTransactions(req: Request, res: Response): Promise<void> {
  const data = await transactionService.getFilteredTransactions(req.user!.id, req.query);
  res.json({ data });
}
