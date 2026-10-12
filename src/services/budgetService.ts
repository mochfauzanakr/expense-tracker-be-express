import { eq, and, or, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { budgets, categories } from '../db/schema.js';
import AppError from '../utils/AppError.js';

export interface CreateBudgetDTO {
  categoryId: string;
  amount: number | string;
  month: string;
}

export interface UpdateBudgetDTO {
  categoryId: string;
  amount: number | string;
  month: string;
}

export async function getBudgets(userId: string) {
  return db.select().from(budgets).where(eq(budgets.userId, userId));
}

export async function getBudgetById(id: string, userId: string) {
  const [data] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));

  if (!data) throw new AppError('Budget not found', 404);
  return data;
}

export async function createBudget(userId: string, dto: CreateBudgetDTO) {
  // 1. Verify category exists and belongs to user or is global
  const [category] = await db.select().from(categories).where(
    and(
      eq(categories.id, dto.categoryId),
      or(eq(categories.userId, userId), isNull(categories.userId))
    )
  );
  if (!category) throw new AppError('Category not found', 404);

  const budgetMonth = new Date(dto.month);

  // 2. Prevent duplicate budget for same category and month
  const [existing] = await db.select().from(budgets).where(
    and(
      eq(budgets.userId, userId),
      eq(budgets.categoryId, dto.categoryId),
      eq(budgets.month, budgetMonth)
    )
  );
  if (existing) throw new AppError('A budget for this category and month already exists', 400);

  const [data] = await db
    .insert(budgets)
    .values({
      userId,
      categoryId: dto.categoryId,
      amount: Number(dto.amount).toFixed(2),
      month: budgetMonth,
    })
    .returning();

  return data;
}

export async function updateBudget(id: string, userId: string, dto: UpdateBudgetDTO) {
  const [category] = await db.select().from(categories).where(
    and(
      eq(categories.id, dto.categoryId),
      or(eq(categories.userId, userId), isNull(categories.userId))
    )
  );
  if (!category) throw new AppError('Category not found', 404);

  const [data] = await db
    .update(budgets)
    .set({
      categoryId: dto.categoryId,
      amount: Number(dto.amount).toFixed(2),
      month: new Date(dto.month),
    })
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
    .returning();

  if (!data) throw new AppError('Budget not found', 404);
  return data;
}

export async function deleteBudget(id: string, userId: string) {
  const [data] = await db
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
    .returning();

  if (!data) throw new AppError('Budget not found', 404);
  return { message: 'Budget deleted' };
}
