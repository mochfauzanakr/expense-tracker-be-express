import { eq, and, or, isNull, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { transactions, categories, accounts } from '../db/schema.js';
import AppError from '../utils/AppError.js';

export interface CreateTransactionDTO {
  accountId: string;
  categoryId?: string | null;
  amount: number | string;
  type: 'income' | 'expense';
  description: string;
}

export interface UpdateTransactionDTO {
  accountId: string;
  categoryId?: string | null;
  amount: number | string;
  type: 'income' | 'expense';
  description: string;
}

export interface TransactionFilterDTO {
  category?: string;
  type?: 'income' | 'expense';
  year?: string;
  month?: string;
  day?: string;
}

export async function getTransactions(userId: string) {
  return db.select().from(transactions).where(eq(transactions.userId, userId));
}

export async function getTransactionById(id: string, userId: string) {
  const [data] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

  if (!data) throw new AppError('Transaction not found', 404);
  return data;
}

export async function createTransaction(userId: string, dto: CreateTransactionDTO) {
  const numAmount = Number(dto.amount);
  const targetCategoryId = dto.categoryId && dto.categoryId !== 'none' ? dto.categoryId : null;

  return db.transaction(async (tx) => {
    // 1. Verify account exists and belongs to user
    const [account] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, dto.accountId), eq(accounts.userId, userId)));
    if (!account) throw new AppError('Account not found', 404);

    // 2. If category provided, verify it belongs to user or is global
    if (targetCategoryId) {
      const [cat] = await tx
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.id, targetCategoryId),
            or(eq(categories.userId, userId), isNull(categories.userId))
          )
        );
      if (!cat) throw new AppError('Category not found', 404);
    }

    // 3. Prevent overdraft on expense
    const currentBalance = Number(account.balance);
    if (dto.type === 'expense' && currentBalance < numAmount) {
      throw new AppError('Insufficient account balance', 400);
    }

    // 4. Create transaction
    const [txData] = await tx
      .insert(transactions)
      .values({
        userId,
        accountId: dto.accountId,
        categoryId: targetCategoryId,
        amount: numAmount.toFixed(2),
        type: dto.type,
        description: dto.description,
      })
      .returning();

    // 5. Update account balance
    const balanceChange = dto.type === 'income' ? numAmount : -numAmount;
    await tx
      .update(accounts)
      .set({
        balance: sql`${accounts.balance} + ${balanceChange}`,
      })
      .where(eq(accounts.id, dto.accountId));

    return txData;
  });
}

export async function updateTransaction(id: string, userId: string, dto: UpdateTransactionDTO) {
  const numAmount = Number(dto.amount);
  const targetCategoryId = dto.categoryId && dto.categoryId !== 'none' ? dto.categoryId : null;

  return db.transaction(async (tx) => {
    // 1. Fetch old transaction
    const [oldTx] = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    if (!oldTx) throw new AppError('Transaction not found', 404);

    // 2. Verify target account belongs to user
    const [targetAccount] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, dto.accountId), eq(accounts.userId, userId)));
    if (!targetAccount) throw new AppError('Account not found', 404);

    // 3. Verify category belongs to user or is global
    if (targetCategoryId) {
      const [cat] = await tx
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.id, targetCategoryId),
            or(eq(categories.userId, userId), isNull(categories.userId))
          )
        );
      if (!cat) throw new AppError('Category not found', 404);
    }

    // 4. Revert old balance changes and apply new ones
    const oldAmount = Number(oldTx.amount);
    if (oldTx.accountId === dto.accountId) {
      const revertOld = oldTx.type === 'income' ? -oldAmount : oldAmount;
      const applyNew = dto.type === 'income' ? numAmount : -numAmount;
      const netChange = revertOld + applyNew;
      const newBalance = Number(targetAccount.balance) + netChange;

      if (newBalance < 0) {
        throw new AppError('Insufficient account balance for this update', 400);
      }

      await tx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} + ${netChange}` })
        .where(eq(accounts.id, dto.accountId));
    } else {
      // Account changed: update both old and target accounts
      const [oldAccount] = await tx
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, oldTx.accountId), eq(accounts.userId, userId)));
      if (!oldAccount) throw new AppError('Old account not found', 404);

      const revertChange = oldTx.type === 'income' ? -oldAmount : oldAmount;
      const newOldBalance = Number(oldAccount.balance) + revertChange;
      if (newOldBalance < 0) {
        throw new AppError('Cannot move transaction: old account balance would become negative', 400);
      }

      const applyChange = dto.type === 'income' ? numAmount : -numAmount;
      const newTargetBalance = Number(targetAccount.balance) + applyChange;
      if (newTargetBalance < 0) {
        throw new AppError('Insufficient balance in target account', 400);
      }

      await tx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} + ${revertChange}` })
        .where(eq(accounts.id, oldTx.accountId));

      await tx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} + ${applyChange}` })
        .where(eq(accounts.id, dto.accountId));
    }

    // 5. Update transaction record
    const [updatedTx] = await tx
      .update(transactions)
      .set({
        accountId: dto.accountId,
        categoryId: targetCategoryId,
        amount: numAmount.toFixed(2),
        type: dto.type,
        description: dto.description,
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();

    return updatedTx;
  });
}

export async function deleteTransaction(id: string, userId: string) {
  return db.transaction(async (tx) => {
    const [data] = await tx
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    if (!data) throw new AppError('Transaction not found', 404);

    const [account] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, data.accountId), eq(accounts.userId, userId)));
    if (!account) throw new AppError('Account not found', 404);

    const numAmount = Number(data.amount);
    const balanceChange = data.type === 'income' ? -numAmount : numAmount;
    const newBalance = Number(account.balance) + balanceChange;

    if (newBalance < 0) {
      throw new AppError('Cannot delete income: resulting account balance would be negative', 400);
    }

    await tx
      .update(accounts)
      .set({
        balance: sql`${accounts.balance} + ${balanceChange}`,
      })
      .where(eq(accounts.id, data.accountId));

    return { message: 'Transaction deleted' };
  });
}

export async function getHighestExpenses(userId: string) {
  return db
    .select({
      description: transactions.description,
      category: categories.name,
      amount: transactions.amount,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'expense')))
    .orderBy(desc(transactions.amount));
}

export async function getFilteredTransactions(userId: string, filters: TransactionFilterDTO) {
  const conditions = [eq(transactions.userId, userId)];

  if (filters.category) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.category);
    if (isUuid) {
      conditions.push(eq(transactions.categoryId, filters.category));
    } else {
      conditions.push(eq(categories.name, filters.category));
    }
  }

  if (filters.type) {
    conditions.push(eq(transactions.type, filters.type));
  }

  if (filters.year) {
    conditions.push(sql`EXTRACT(YEAR FROM ${transactions.createdAt}) = ${parseInt(filters.year)}`);
  }
  if (filters.month) {
    conditions.push(sql`EXTRACT(MONTH FROM ${transactions.createdAt}) = ${parseInt(filters.month)}`);
  }
  if (filters.day) {
    conditions.push(sql`EXTRACT(DAY FROM ${transactions.createdAt}) = ${parseInt(filters.day)}`);
  }

  return db
    .select({
      id: transactions.id,
      userId: transactions.userId,
      accountId: transactions.accountId,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      amount: transactions.amount,
      type: transactions.type,
      description: transactions.description,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conditions));
}
