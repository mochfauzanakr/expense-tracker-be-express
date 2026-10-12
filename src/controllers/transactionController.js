import { db } from '../db/index.js';
import { transactions, categories, accounts } from '../db/schema.js';
import { eq, and, or, isNull, desc, sql } from 'drizzle-orm';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

export const getTransactions = catchAsync(async (req, res) => {
  const data = await db.select().from(transactions).where(eq(transactions.userId, req.user.id));
  res.json({ data });
});

export const getTransaction = catchAsync(async (req, res) => {
  const [data] = await db.select().from(transactions)
    .where(and(eq(transactions.id, req.params.id), eq(transactions.userId, req.user.id)));
  if (!data) throw new AppError('Transaction not found', 404);
  res.json({ data });
});

export const createTransaction = catchAsync(async (req, res) => {
  const { accountId, categoryId, amount, type, description } = req.body;
  const numAmount = Number(amount);
  const targetCategoryId = (categoryId && categoryId !== 'none') ? categoryId : null;

  const data = await db.transaction(async (tx) => {
    // 1. Verify account exists and belongs to user
    const [account] = await tx.select().from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, req.user.id)));
    if (!account) throw new AppError('Account not found', 404);

    // 2. If category provided, verify it belongs to user or is global
    if (targetCategoryId) {
      const [cat] = await tx.select().from(categories).where(
        and(
          eq(categories.id, targetCategoryId),
          or(eq(categories.userId, req.user.id), isNull(categories.userId))
        )
      );
      if (!cat) throw new AppError('Category not found', 404);
    }

    // 3. Prevent overdraft on expense
    const currentBalance = Number(account.balance);
    if (type === 'expense' && currentBalance < numAmount) {
      throw new AppError('Insufficient account balance', 400);
    }

    // 4. Create transaction
    const [txData] = await tx.insert(transactions)
      .values({ 
        userId: req.user.id, 
        accountId, 
        categoryId: targetCategoryId, 
        amount: numAmount.toFixed(2), 
        type, 
        description 
      })
      .returning();

    // 5. Update account balance
    const balanceChange = type === 'income' ? numAmount : -numAmount;
    await tx.update(accounts)
      .set({
        balance: sql`${accounts.balance} + ${balanceChange}`
      })
      .where(eq(accounts.id, accountId));

    return txData;
  });

  res.status(201).json({ data });
});

export const updateTransaction = catchAsync(async (req, res) => {
  const { accountId, categoryId, amount, type, description } = req.body;
  const numAmount = Number(amount);
  const targetCategoryId = (categoryId && categoryId !== 'none') ? categoryId : null;

  const data = await db.transaction(async (tx) => {
    // 1. Fetch old transaction
    const [oldTx] = await tx.select().from(transactions)
      .where(and(eq(transactions.id, req.params.id), eq(transactions.userId, req.user.id)));
    if (!oldTx) throw new AppError('Transaction not found', 404);

    // 2. Verify target account belongs to user
    const [targetAccount] = await tx.select().from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, req.user.id)));
    if (!targetAccount) throw new AppError('Account not found', 404);

    // 3. Verify category belongs to user or is global
    if (targetCategoryId) {
      const [cat] = await tx.select().from(categories).where(
        and(
          eq(categories.id, targetCategoryId),
          or(eq(categories.userId, req.user.id), isNull(categories.userId))
        )
      );
      if (!cat) throw new AppError('Category not found', 404);
    }

    // 4. Revert old transaction balance changes and apply new ones
    const oldAmount = Number(oldTx.amount);
    if (oldTx.accountId === accountId) {
      const revertOld = oldTx.type === 'income' ? -oldAmount : oldAmount;
      const applyNew = type === 'income' ? numAmount : -numAmount;
      const netChange = revertOld + applyNew;
      const newBalance = Number(targetAccount.balance) + netChange;

      if (newBalance < 0) {
        throw new AppError('Insufficient account balance for this update', 400);
      }

      await tx.update(accounts)
        .set({ balance: sql`${accounts.balance} + ${netChange}` })
        .where(eq(accounts.id, accountId));
    } else {
      // Account changed: update both old and target accounts
      const [oldAccount] = await tx.select().from(accounts)
        .where(and(eq(accounts.id, oldTx.accountId), eq(accounts.userId, req.user.id)));
      if (!oldAccount) throw new AppError('Old account not found', 404);

      const revertChange = oldTx.type === 'income' ? -oldAmount : oldAmount;
      const newOldBalance = Number(oldAccount.balance) + revertChange;
      if (newOldBalance < 0) {
        throw new AppError('Cannot move transaction: old account balance would become negative', 400);
      }

      const applyChange = type === 'income' ? numAmount : -numAmount;
      const newTargetBalance = Number(targetAccount.balance) + applyChange;
      if (newTargetBalance < 0) {
        throw new AppError('Insufficient balance in target account', 400);
      }

      await tx.update(accounts)
        .set({ balance: sql`${accounts.balance} + ${revertChange}` })
        .where(eq(accounts.id, oldTx.accountId));

      await tx.update(accounts)
        .set({ balance: sql`${accounts.balance} + ${applyChange}` })
        .where(eq(accounts.id, accountId));
    }

    // 5. Update transaction record
    const [updatedTx] = await tx.update(transactions)
      .set({ 
        accountId, 
        categoryId: targetCategoryId, 
        amount: numAmount.toFixed(2), 
        type, 
        description 
      })
      .where(and(eq(transactions.id, req.params.id), eq(transactions.userId, req.user.id)))
      .returning();

    return updatedTx;
  });

  res.json({ data });
});

export const deleteTransaction = catchAsync(async (req, res) => {
  await db.transaction(async (tx) => {
    const [data] = await tx.delete(transactions)
      .where(and(eq(transactions.id, req.params.id), eq(transactions.userId, req.user.id)))
      .returning();
    if (!data) throw new AppError('Transaction not found', 404);

    const [account] = await tx.select().from(accounts)
      .where(and(eq(accounts.id, data.accountId), eq(accounts.userId, req.user.id)));
    if (!account) throw new AppError('Account not found', 404);

    const numAmount = Number(data.amount);
    const balanceChange = data.type === 'income' ? -numAmount : numAmount;
    const newBalance = Number(account.balance) + balanceChange;

    if (newBalance < 0) {
      throw new AppError('Cannot delete income: resulting account balance would be negative', 400);
    }

    await tx.update(accounts)
      .set({
        balance: sql`${accounts.balance} + ${balanceChange}`
      })
      .where(eq(accounts.id, data.accountId));
  });

  res.json({ message: 'Transaction deleted' });
});

export const getHighestExpenses = catchAsync(async (req, res) => {
  const data = await db.select({
    description: transactions.description,
    category: categories.name,
    amount: transactions.amount
  })
  .from(transactions)
  .innerJoin(categories, eq(transactions.categoryId, categories.id))
  .where(and(
    eq(transactions.userId, req.user.id),
    eq(transactions.type, 'expense')
  ))
  .orderBy(desc(transactions.amount));

  res.json({ data });
});

export const getFilteredTransactions = catchAsync(async (req, res) => {
  const { category, type, month, year, day } = req.query;

  const conditions = [eq(transactions.userId, req.user.id)];

  if (category) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
    if (isUuid) {
      conditions.push(eq(transactions.categoryId, category));
    } else {
      conditions.push(eq(categories.name, category));
    }
  }

  if (type) {
    conditions.push(eq(transactions.type, type));
  }

  if (year) {
    conditions.push(sql`EXTRACT(YEAR FROM ${transactions.createdAt}) = ${parseInt(year)}`);
  }
  if (month) {
    conditions.push(sql`EXTRACT(MONTH FROM ${transactions.createdAt}) = ${parseInt(month)}`);
  }
  if (day) {
    conditions.push(sql`EXTRACT(DAY FROM ${transactions.createdAt}) = ${parseInt(day)}`);
  }

  const data = await db.select({
    id: transactions.id,
    userId: transactions.userId,
    accountId: transactions.accountId,
    categoryId: transactions.categoryId,
    categoryName: categories.name,
    categoryIcon: categories.icon,
    amount: transactions.amount,
    type: transactions.type,
    description: transactions.description,
    createdAt: transactions.createdAt
  })
  .from(transactions)
  .leftJoin(categories, eq(transactions.categoryId, categories.id))
  .where(and(...conditions));

  res.json({ data });
});
