import { eq, and, or, isNull, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { savingsGoals, accounts, transactions, categories } from '../db/schema.js';
import AppError from '../utils/AppError.js';

export interface CreateSavingsGoalDTO {
  name: string;
  targetAmount: number | string;
  currentAmount?: number | string;
  deadline?: string;
  accountId?: string;
}

export interface UpdateSavingsGoalDTO {
  name?: string;
  targetAmount?: number | string;
  currentAmount?: number | string;
  deadline?: string;
  accountId?: string;
  categoryId?: string;
}

export async function getSavingsGoals(userId: string) {
  return db.select().from(savingsGoals).where(eq(savingsGoals.userId, userId));
}

export async function getSavingsGoalById(id: string, userId: string) {
  const [data] = await db
    .select()
    .from(savingsGoals)
    .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)));

  if (!data) throw new AppError('Savings goal not found', 404);
  return data;
}

export async function createSavingsGoal(userId: string, dto: CreateSavingsGoalDTO) {
  const initialCurrent = dto.currentAmount ? Number(dto.currentAmount) : 0;

  return db.transaction(async (tx) => {
    if (initialCurrent > 0) {
      if (!dto.accountId) {
        throw new AppError('accountId is required when currentAmount is greater than 0', 400);
      }

      const [account] = await tx
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, dto.accountId), eq(accounts.userId, userId)));
      if (!account) throw new AppError('Account not found', 404);

      if (Number(account.balance) < initialCurrent) {
        throw new AppError('Insufficient balance in account', 400);
      }

      await tx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} - ${initialCurrent.toFixed(2)}` })
        .where(eq(accounts.id, dto.accountId));

      const [savingsCat] = await tx.select().from(categories).where(
        and(
          or(eq(categories.userId, userId), isNull(categories.userId)),
          sql`LOWER(${categories.name}) IN ('savings', 'tabungan')`
        )
      );

      let targetCatId = savingsCat ? savingsCat.id : null;
      if (!targetCatId) {
        const [newCat] = await tx
          .insert(categories)
          .values({
            userId,
            name: 'Tabungan',
            icon: 'landmark',
          })
          .returning();
        targetCatId = newCat.id;
      }

      await tx.insert(transactions).values({
        userId,
        accountId: dto.accountId,
        categoryId: targetCatId,
        amount: initialCurrent.toFixed(2),
        type: 'expense',
        description: `Savings goal initial contribution: ${dto.name}`,
      });
    }

    const [createdGoal] = await tx
      .insert(savingsGoals)
      .values({
        userId,
        name: dto.name,
        targetAmount: Number(dto.targetAmount).toFixed(2),
        currentAmount: initialCurrent.toFixed(2),
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      })
      .returning();

    return createdGoal;
  });
}

export async function updateSavingsGoal(id: string, userId: string, dto: UpdateSavingsGoalDTO) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(savingsGoals)
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)));
    if (!existing) throw new AppError('Savings goal not found', 404);

    if (dto.currentAmount !== undefined) {
      const diff = Number(dto.currentAmount) - Number(existing.currentAmount);
      if (diff > 0) {
        if (!dto.accountId) {
          throw new AppError('accountId is required when currentAmount increases', 400);
        }

        const [account] = await tx
          .select()
          .from(accounts)
          .where(and(eq(accounts.id, dto.accountId), eq(accounts.userId, userId)));
        if (!account) throw new AppError('Account not found', 404);

        if (Number(account.balance) < diff) {
          throw new AppError('Insufficient balance in account', 400);
        }

        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${diff.toFixed(2)}` })
          .where(eq(accounts.id, dto.accountId));

        let targetCategoryId = dto.categoryId;
        if (targetCategoryId) {
          const [cat] = await tx.select().from(categories).where(
            and(
              eq(categories.id, targetCategoryId),
              or(eq(categories.userId, userId), isNull(categories.userId))
            )
          );
          if (!cat) throw new AppError('Category not found', 404);
        } else {
          const [savingsCat] = await tx.select().from(categories).where(
            and(
              or(eq(categories.userId, userId), isNull(categories.userId)),
              sql`LOWER(${categories.name}) IN ('savings', 'tabungan')`
            )
          );
          if (savingsCat) {
            targetCategoryId = savingsCat.id;
          } else {
            const [newCat] = await tx
              .insert(categories)
              .values({
                userId,
                name: 'Tabungan',
                icon: 'landmark',
              })
              .returning();
            targetCategoryId = newCat.id;
          }
        }

        await tx.insert(transactions).values({
          userId,
          accountId: dto.accountId,
          categoryId: targetCategoryId,
          amount: diff.toFixed(2),
          type: 'expense',
          description: `Savings goal contribution: ${dto.name || existing.name}`,
        });
      }
    }

    const [updatedGoal] = await tx
      .update(savingsGoals)
      .set({
        name: dto.name,
        targetAmount: dto.targetAmount !== undefined ? Number(dto.targetAmount).toFixed(2) : undefined,
        currentAmount: dto.currentAmount !== undefined ? Number(dto.currentAmount).toFixed(2) : undefined,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      })
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)))
      .returning();

    return updatedGoal;
  });
}

export async function deleteSavingsGoal(id: string, userId: string) {
  const [data] = await db
    .delete(savingsGoals)
    .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)))
    .returning();

  if (!data) throw new AppError('Savings goal not found', 404);
  return { message: 'Savings goal deleted' };
}
