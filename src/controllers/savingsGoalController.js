import { db } from '../db/index.js';
import { savingsGoals, accounts, transactions, categories } from '../db/schema.js';
import { eq, and, or, isNull, sql } from 'drizzle-orm';
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
  const { name, targetAmount, currentAmount, deadline, accountId } = req.body;
  const initialCurrent = currentAmount ? Number(currentAmount) : 0;

  const data = await db.transaction(async (tx) => {
    if (initialCurrent > 0) {
      if (!accountId) {
        throw new AppError('accountId is required when currentAmount is greater than 0', 400);
      }

      const [account] = await tx.select().from(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, req.user.id)));
      if (!account) throw new AppError('Account not found', 404);

      if (Number(account.balance) < initialCurrent) {
        throw new AppError('Insufficient balance in account', 400);
      }

      await tx.update(accounts)
        .set({ balance: sql`${accounts.balance} - ${initialCurrent.toFixed(2)}` })
        .where(eq(accounts.id, accountId));

      const [savingsCat] = await tx.select().from(categories).where(
        and(
          or(eq(categories.userId, req.user.id), isNull(categories.userId)),
          sql`LOWER(${categories.name}) IN ('savings', 'tabungan')`
        )
      );

      let targetCatId = savingsCat ? savingsCat.id : null;
      if (!targetCatId) {
        const [newCat] = await tx.insert(categories).values({
          userId: req.user.id,
          name: 'Tabungan',
          icon: 'landmark'
        }).returning();
        targetCatId = newCat.id;
      }

      await tx.insert(transactions).values({
        userId: req.user.id,
        accountId,
        categoryId: targetCatId,
        amount: initialCurrent.toFixed(2),
        type: 'expense',
        description: `Savings goal initial contribution: ${name}`
      });
    }

    const [createdGoal] = await tx.insert(savingsGoals)
      .values({ 
        userId: req.user.id, 
        name, 
        targetAmount: Number(targetAmount).toFixed(2), 
        currentAmount: initialCurrent.toFixed(2), 
        deadline 
      })
      .returning();

    return createdGoal;
  });

  res.status(201).json({ data });
});

export const updateSavingsGoal = catchAsync(async (req, res) => {
  const { name, targetAmount, currentAmount, deadline, accountId, categoryId } = req.body;

  const data = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(savingsGoals)
      .where(and(eq(savingsGoals.id, req.params.id), eq(savingsGoals.userId, req.user.id)));
    if (!existing) throw new AppError('Savings goal not found', 404);

    if (currentAmount !== undefined) {
      const diff = Number(currentAmount) - Number(existing.currentAmount);
      if (diff > 0) {
        if (!accountId) {
          throw new AppError('accountId is required when currentAmount increases', 400);
        }

        const [account] = await tx.select().from(accounts)
          .where(and(eq(accounts.id, accountId), eq(accounts.userId, req.user.id)));
        if (!account) throw new AppError('Account not found', 404);

        if (Number(account.balance) < diff) {
          throw new AppError('Insufficient balance in account', 400);
        }

        await tx.update(accounts)
          .set({ balance: sql`${accounts.balance} - ${diff.toFixed(2)}` })
          .where(eq(accounts.id, accountId));

        let targetCategoryId = categoryId;
        if (targetCategoryId) {
          const [cat] = await tx.select().from(categories).where(
            and(
              eq(categories.id, targetCategoryId),
              or(eq(categories.userId, req.user.id), isNull(categories.userId))
            )
          );
          if (!cat) throw new AppError('Category not found', 404);
        } else {
          const [savingsCat] = await tx.select().from(categories).where(
            and(
              or(eq(categories.userId, req.user.id), isNull(categories.userId)),
              sql`LOWER(${categories.name}) IN ('savings', 'tabungan')`
            )
          );
          if (savingsCat) {
            targetCategoryId = savingsCat.id;
          } else {
            const [newCat] = await tx.insert(categories).values({
              userId: req.user.id,
              name: 'Tabungan',
              icon: 'landmark'
            }).returning();
            targetCategoryId = newCat.id;
          }
        }

        await tx.insert(transactions).values({
          userId: req.user.id,
          accountId,
          categoryId: targetCategoryId,
          amount: diff.toFixed(2),
          type: 'expense',
          description: `Savings goal contribution: ${name || existing.name}`
        });
      }
    }

    const [updatedGoal] = await tx.update(savingsGoals)
      .set({ 
        name, 
        targetAmount: targetAmount !== undefined ? Number(targetAmount).toFixed(2) : undefined, 
        currentAmount: currentAmount !== undefined ? Number(currentAmount).toFixed(2) : undefined, 
        deadline 
      })
      .where(and(eq(savingsGoals.id, req.params.id), eq(savingsGoals.userId, req.user.id)))
      .returning();

    return updatedGoal;
  });

  res.json({ data });
});

export const deleteSavingsGoal = catchAsync(async (req, res) => {
  const [data] = await db.delete(savingsGoals)
    .where(and(eq(savingsGoals.id, req.params.id), eq(savingsGoals.userId, req.user.id)))
    .returning();
  if (!data) throw new AppError('Savings goal not found', 404);
  res.json({ message: 'Savings goal deleted' });
});
