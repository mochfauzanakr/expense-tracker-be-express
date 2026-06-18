import { db } from '../db/index.js';
import { savingsGoals, accounts, transactions, categories } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
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
  const { name, targetAmount, currentAmount, deadline, accountId, categoryId } = req.body;

  const [existing] = await db.select().from(savingsGoals)
    .where(and(eq(savingsGoals.id, req.params.id), eq(savingsGoals.userId, req.user.id)));
  if (!existing) throw new AppError('Savings goal not found', 404);

  if (currentAmount !== undefined) {
    const diff = Number(currentAmount) - Number(existing.currentAmount);
    if (diff > 0) {
      if (!accountId) {
        throw new AppError('accountId is required when currentAmount increases', 400);
      }

      const [account] = await db.select().from(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, req.user.id)));
      if (!account) throw new AppError('Account not found', 404);

      const newBalance = Number(account.balance) - diff;
      if (newBalance < 0) {
        throw new AppError('Insufficient balance in account', 400);
      }

      await db.update(accounts)
        .set({ balance: newBalance.toFixed(2) })
        .where(eq(accounts.id, accountId));

      let targetCategoryId = categoryId;
      if (!targetCategoryId) {
        const [savingsCat] = await db.select().from(categories)
          .where(sql`LOWER(${categories.name}) = 'savings' OR LOWER(${categories.name}) = 'tabungan'`);
        if (savingsCat) {
          targetCategoryId = savingsCat.id;
        } else {
          const [newCat] = await db.insert(categories).values({ name: 'Savings' }).returning();
          targetCategoryId = newCat.id;
        }
      }

      await db.insert(transactions).values({
        userId: req.user.id,
        accountId,
        categoryId: targetCategoryId,
        amount: diff.toFixed(2),
        type: 'expense',
        description: `Savings goal contribution: ${name || existing.name}`
      });
    }
  }

  const [data] = await db.update(savingsGoals)
    .set({ name, targetAmount, currentAmount, deadline })
    .where(and(eq(savingsGoals.id, req.params.id), eq(savingsGoals.userId, req.user.id)))
    .returning();

  res.json({ data });
});

export const deleteSavingsGoal = catchAsync(async (req, res) => {
  const [data] = await db.delete(savingsGoals)
    .where(and(eq(savingsGoals.id, req.params.id), eq(savingsGoals.userId, req.user.id)))
    .returning();
  if (!data) throw new AppError('Savings goal not found', 404);
  res.json({ message: 'Savings goal deleted' });
});
