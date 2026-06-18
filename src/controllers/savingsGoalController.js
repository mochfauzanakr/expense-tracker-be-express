import { db } from '../db/index.js';
import { savingsGoals } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

export const getSavingsGoals = catchAsync(async (req, res) => {
  const data = await db.select().from(savingsGoals).where(eq(savingsGoals.userId, req.user.id));
  res.json({ data });
});

export const getSavingsGoal = catchAsync(async (req, res) => {
  const [data] = await db.select().from(savingsGoals)
    .where(and(eq(savingsGoals.id, req.params.id), eq(savingsGoals.userId, req.user.id)));
  if (!data) throw new AppError('Savings goal not found', 404);
  res.json({ data });
});

export const createSavingsGoal = catchAsync(async (req, res) => {
  const { name, targetAmount, currentAmount, deadline } = req.body;
  const [data] = await db.insert(savingsGoals)
    .values({ userId: req.user.id, name, targetAmount, currentAmount, deadline })
    .returning();
  res.status(201).json({ data });
});

export const updateSavingsGoal = catchAsync(async (req, res) => {
  const { name, targetAmount, currentAmount, deadline } = req.body;
  const [data] = await db.update(savingsGoals)
    .set({ name, targetAmount, currentAmount, deadline })
    .where(and(eq(savingsGoals.id, req.params.id), eq(savingsGoals.userId, req.user.id)))
    .returning();
  if (!data) throw new AppError('Savings goal not found', 404);
  res.json({ data });
});

export const deleteSavingsGoal = catchAsync(async (req, res) => {
  const [data] = await db.delete(savingsGoals)
    .where(and(eq(savingsGoals.id, req.params.id), eq(savingsGoals.userId, req.user.id)))
    .returning();
  if (!data) throw new AppError('Savings goal not found', 404);
  res.json({ message: 'Savings goal deleted' });
});
