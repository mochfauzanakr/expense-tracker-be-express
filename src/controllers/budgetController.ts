import { Request, Response } from 'express';
import * as budgetService from '../services/budgetService.js';

export async function getBudgets(req: Request, res: Response): Promise<void> {
  const data = await budgetService.getBudgets(req.user!.id);
  res.json({ data });
}

export async function getBudget(req: Request, res: Response): Promise<void> {
  const data = await budgetService.getBudgetById(req.params.id as string, req.user!.id);
  res.json({ data });
}

export async function createBudget(req: Request, res: Response): Promise<void> {
  const data = await budgetService.createBudget(req.user!.id, req.body);
  res.status(201).json({ data });
}

export async function updateBudget(req: Request, res: Response): Promise<void> {
  const data = await budgetService.updateBudget(req.params.id as string, req.user!.id, req.body);
  res.json({ data });
}

export async function deleteBudget(req: Request, res: Response): Promise<void> {
  const result = await budgetService.deleteBudget(req.params.id as string, req.user!.id);
  res.json(result);
}
