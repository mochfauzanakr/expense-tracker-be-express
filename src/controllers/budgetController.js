import { db } from '../db/index.js';
import { budgets, categories } from '../db/schema.js';
import { eq, and, or, isNull } from 'drizzle-orm';
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

  // 1. Verify category exists and belongs to user or is global
  const [category] = await db.select().from(categories).where(
    and(
      eq(categories.id, categoryId),
      or(eq(categories.userId, req.user.id), isNull(categories.userId))
    )
  );
  if (!category) throw new AppError('Category not found', 404);

  const budgetMonth = new Date(month);

  // 2. Prevent duplicate budget for same category and month
  const [existing] = await db.select().from(budgets).where(
    and(
      eq(budgets.userId, req.user.id),
      eq(budgets.categoryId, categoryId),
      eq(budgets.month, budgetMonth)
    )
  );
  if (existing) throw new AppError('A budget for this category and month already exists', 400);

  const [data] = await db.insert(budgets)
    .values({ 
      userId: req.user.id, 
      categoryId, 
      amount: Number(amount).toFixed(2), 
      month: budgetMonth 
    })
    .returning();
  res.status(201).json({ data });
});

export const updateBudget = catchAsync(async (req, res) => {
  const { categoryId, amount, month } = req.body;

  // 1. Verify category exists and belongs to user or is global
  const [category] = await db.select().from(categories).where(
    and(
      eq(categories.id, categoryId),
      or(eq(categories.userId, req.user.id), isNull(categories.userId))
    )
  );
  if (!category) throw new AppError('Category not found', 404);

  const [data] = await db.update(budgets)
    .set({ 
      categoryId, 
      amount: Number(amount).toFixed(2), 
      month: new Date(month) 
    })
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
