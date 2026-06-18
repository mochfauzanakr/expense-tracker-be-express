import { db } from '../db/index.js';
import { budgets } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

export const getBudgets = catchAsync(async (req, res) => {
  const data = await db.select().from(budgets).where(eq(budgets.userId, req.user.id));
  res.json({ data });
});

export const getBudget = catchAsync(async (req, res) => {
  const [data] = await db.select().from(budgets)
    .where(and(eq(budgets.id, req.params.id), eq(budgets.userId, req.user.id)));
  if (!data) throw new AppError('Budget not found', 404);
  res.json({ data });
});

export const createBudget = catchAsync(async (req, res) => {
  const { categoryId, amount, month } = req.body;
  const [data] = await db.insert(budgets)
    .values({ userId: req.user.id, categoryId, amount, month })
    .returning();
  res.status(201).json({ data });
});

export const updateBudget = catchAsync(async (req, res) => {
  const { categoryId, amount, month } = req.body;
  const [data] = await db.update(budgets)
    .set({ categoryId, amount, month })
    .where(and(eq(budgets.id, req.params.id), eq(budgets.userId, req.user.id)))
    .returning();
  if (!data) throw new AppError('Budget not found', 404);
  res.json({ data });
});

export const deleteBudget = catchAsync(async (req, res) => {
  const [data] = await db.delete(budgets)
    .where(and(eq(budgets.id, req.params.id), eq(budgets.userId, req.user.id)))
    .returning();
  if (!data) throw new AppError('Budget not found', 404);
  res.json({ message: 'Budget deleted' });
});
