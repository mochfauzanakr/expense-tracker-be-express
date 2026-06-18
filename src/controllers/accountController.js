import { db } from '../db/index.js';
import { accounts } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

export const getAccounts = catchAsync(async (req, res) => {
  const data = await db.select().from(accounts).where(eq(accounts.userId, req.user.id));
  res.json({ data });
});

export const getAccount = catchAsync(async (req, res) => {
  const [data] = await db.select().from(accounts)
    .where(and(eq(accounts.id, req.params.id), eq(accounts.userId, req.user.id)));
  if (!data) throw new AppError('Account not found', 404);
  res.json({ data });
});

export const createAccount = catchAsync(async (req, res) => {
  const { name, balance } = req.body;
  const [data] = await db.insert(accounts).values({ userId: req.user.id, name, balance }).returning();
  res.status(201).json({ data });
});

export const updateAccount = catchAsync(async (req, res) => {
  const { name, balance } = req.body;
  const [data] = await db.update(accounts)
    .set({ name, balance })
    .where(and(eq(accounts.id, req.params.id), eq(accounts.userId, req.user.id)))
    .returning();
  if (!data) throw new AppError('Account not found', 404);
  res.json({ data });
});

export const deleteAccount = catchAsync(async (req, res) => {
  const [data] = await db.delete(accounts)
    .where(and(eq(accounts.id, req.params.id), eq(accounts.userId, req.user.id)))
    .returning();
  if (!data) throw new AppError('Account not found', 404);
  res.json({ message: 'Account deleted' });
});
