import { Request, Response } from 'express';
import * as categoryService from '../services/categoryService.js';

export async function getCategories(req: Request, res: Response): Promise<void> {
  const data = await categoryService.getCategories(req.user!.id);
  res.json({ data });
}

export async function getCategory(req: Request, res: Response): Promise<void> {
  const data = await categoryService.getCategoryById(req.params.id as string, req.user!.id);
  res.json({ data });
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const data = await categoryService.createCategory(req.user!.id, req.body);
  res.status(201).json({ data });
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const data = await categoryService.updateCategory(req.params.id as string, req.user!.id, req.body);
  res.json({ data });
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const result = await categoryService.deleteCategory(req.params.id as string, req.user!.id);
  res.json(result);
}
