import { Request, Response } from 'express';
import * as savingsGoalService from '../services/savingsGoalService.js';

export async function getSavingsGoals(req: Request, res: Response): Promise<void> {
  const data = await savingsGoalService.getSavingsGoals(req.user!.id);
  res.json({ data });
}

export async function getSavingsGoal(req: Request, res: Response): Promise<void> {
  const data = await savingsGoalService.getSavingsGoalById(req.params.id as string, req.user!.id);
  res.json({ data });
}

export async function createSavingsGoal(req: Request, res: Response): Promise<void> {
  const data = await savingsGoalService.createSavingsGoal(req.user!.id, req.body);
  res.status(201).json({ data });
}

export async function updateSavingsGoal(req: Request, res: Response): Promise<void> {
  const data = await savingsGoalService.updateSavingsGoal(req.params.id as string, req.user!.id, req.body);
  res.json({ data });
}

export async function deleteSavingsGoal(req: Request, res: Response): Promise<void> {
  const result = await savingsGoalService.deleteSavingsGoal(req.params.id as string, req.user!.id);
  res.json(result);
}
