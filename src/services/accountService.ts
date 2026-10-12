import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { accounts } from '../db/schema.js';
import AppError from '../utils/AppError.js';

export interface CreateAccountDTO {
  name: string;
  balance?: number | string;
}

export interface UpdateAccountDTO {
  name?: string;
  balance?: number | string;
}

export async function getAccounts(userId: string) {
  return db.select().from(accounts).where(eq(accounts.userId, userId));
}

export async function getAccountById(id: string, userId: string) {
  const [data] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));

  if (!data) throw new AppError('Account not found', 404);
  return data;
}

export async function createAccount(userId: string, dto: CreateAccountDTO) {
  const [data] = await db
    .insert(accounts)
    .values({
      userId,
      name: dto.name,
      balance: dto.balance !== undefined ? String(dto.balance) : '0',
    })
    .returning();

  return data;
}

export async function updateAccount(id: string, userId: string, dto: UpdateAccountDTO) {
  const [data] = await db
    .update(accounts)
    .set({
      name: dto.name,
      balance: dto.balance !== undefined ? String(dto.balance) : undefined,
    })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning();

  if (!data) throw new AppError('Account not found', 404);
  return data;
}

export async function deleteAccount(id: string, userId: string) {
  const [data] = await db
    .delete(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning();

  if (!data) throw new AppError('Account not found', 404);
  return { message: 'Account deleted' };
}
