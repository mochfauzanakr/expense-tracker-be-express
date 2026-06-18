import { db } from '../db/index.js';
import { transactions, categories, accounts } from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
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
  const targetCategoryId = (categoryId && categoryId !== 'none') ? categoryId : null;

  const [data] = await db.insert(transactions)
    .values({ userId: req.user.id, accountId, categoryId: targetCategoryId, amount, type, description })
    .returning();

  const balanceChange = type === 'income' ? Number(amount) : -Number(amount);
  await db.update(accounts)
    .set({
      balance: sql`${accounts.balance} + ${balanceChange}`
    })
    .where(eq(accounts.id, accountId));

  res.status(201).json({ data });
});

export const updateTransaction = catchAsync(async (req, res) => {
  const { accountId, categoryId, amount, type, description } = req.body;
  const targetCategoryId = (categoryId && categoryId !== 'none') ? categoryId : null;

  // 1. Fetch old transaction values
  const [oldTx] = await db.select().from(transactions)
    .where(and(eq(transactions.id, req.params.id), eq(transactions.userId, req.user.id)));
  if (!oldTx) throw new AppError('Transaction not found', 404);

  // 2. Perform the update
  const [data] = await db.update(transactions)
    .set({ accountId, categoryId: targetCategoryId, amount, type, description })
    .where(and(eq(transactions.id, req.params.id), eq(transactions.userId, req.user.id)))
    .returning();

  // 3. Revert old transaction balance changes and apply new ones
  if (oldTx.accountId === accountId) {
    const revertOld = oldTx.type === 'income' ? -Number(oldTx.amount) : Number(oldTx.amount);
    const applyNew = type === 'income' ? Number(amount) : -Number(amount);
    const netChange = revertOld + applyNew;

    await db.update(accounts)
      .set({
        balance: sql`${accounts.balance} + ${netChange}`
      })
      .where(eq(accounts.id, accountId));
  } else {
    // Account changed, update both
    const revertChange = oldTx.type === 'income' ? -Number(oldTx.amount) : Number(oldTx.amount);
    await db.update(accounts)
      .set({
        balance: sql`${accounts.balance} + ${revertChange}`
      })
      .where(eq(accounts.id, oldTx.accountId));

    const applyChange = type === 'income' ? Number(amount) : -Number(amount);
    await db.update(accounts)
      .set({
        balance: sql`${accounts.balance} + ${applyChange}`
      })
      .where(eq(accounts.id, accountId));
  }

  res.json({ data });
});

export const deleteTransaction = catchAsync(async (req, res) => {
  const [data] = await db.delete(transactions)
    .where(and(eq(transactions.id, req.params.id), eq(transactions.userId, req.user.id)))
    .returning();
  if (!data) throw new AppError('Transaction not found', 404);

  const balanceChange = data.type === 'income' ? -Number(data.amount) : Number(data.amount);
  await db.update(accounts)
    .set({
      balance: sql`${accounts.balance} + ${balanceChange}`
    })
    .where(eq(accounts.id, data.accountId));

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
