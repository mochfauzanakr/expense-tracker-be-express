import { db } from '../db/index.js';
import { transactions } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
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
  const [data] = await db.insert(transactions)
    .values({ userId: req.user.id, accountId, categoryId, amount, type, description })
    .returning();
  res.status(201).json({ data });
});

export const updateTransaction = catchAsync(async (req, res) => {
  const { accountId, categoryId, amount, type, description } = req.body;
  const [data] = await db.update(transactions)
    .set({ accountId, categoryId, amount, type, description })
    .where(and(eq(transactions.id, req.params.id), eq(transactions.userId, req.user.id)))
    .returning();
  if (!data) throw new AppError('Transaction not found', 404);
  res.json({ data });
});

export const deleteTransaction = catchAsync(async (req, res) => {
  const [data] = await db.delete(transactions)
    .where(and(eq(transactions.id, req.params.id), eq(transactions.userId, req.user.id)))
    .returning();
  if (!data) throw new AppError('Transaction not found', 404);
  res.json({ message: 'Transaction deleted' });
});
