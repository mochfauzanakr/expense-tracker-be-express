import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

export const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  const [existingUser] = await db.select().from(users).where(eq(users.email, email));
  if (existingUser) throw new AppError('User already exists', 400);

  const passwordHash = await bcrypt.hash(password, 10);
  const [data] = await db.insert(users).values({ name, email, passwordHash }).returning();
  res.status(201).json({ message: 'User registered successfully', data });
});

export const getUser = catchAsync(async (req, res) => {
  const [data] = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    isActive: users.isActive,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, req.params.id));
  if (!data) throw new AppError('User not found', 404);
  res.json({ data });
});

export const updateUser = catchAsync(async (req, res) => {
  const { name, email } = req.body;
  const [data] = await db.update(users)
    .set({ name, email })
    .where(eq(users.id, req.params.id))
    .returning({ id: users.id, name: users.name, email: users.email });
  if (!data) throw new AppError('User not found', 404);
  res.json({ data });
});

export const deleteUser = catchAsync(async (req, res) => {
  // ponytail: soft-delete via isActive flag; hard delete on demand
  const [data] = await db.update(users)
    .set({ isActive: false, deletedAt: new Date() })
    .where(eq(users.id, req.params.id))
    .returning({ id: users.id });
  if (!data) throw new AppError('User not found', 404);
  res.json({ message: 'User deactivated' });
});
