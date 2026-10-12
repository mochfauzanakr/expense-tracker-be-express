import { db } from '../db/index.js';
import { users, accounts, categories } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

export const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  const [existingUser] = await db.select().from(users).where(eq(users.email, email));
  if (existingUser) throw new AppError('User already exists', 400);

  const passwordHash = await bcrypt.hash(password, 10);

  const data = await db.transaction(async (tx) => {
    const [newUser] = await tx.insert(users).values({ name, email, passwordHash }).returning();

    // Auto-create default Cash account for new user
    await tx.insert(accounts).values({
      userId: newUser.id,
      name: 'Cash',
      balance: '0',
    });

    // Auto-create default categories for new user
    const defaultCategories = [
      { name: 'Makanan & Minuman', icon: 'coffee' },
      { name: 'Belanja', icon: 'shopping-bag' },
      { name: 'Transportasi', icon: 'car' },
      { name: 'Tagihan & Utilitas', icon: 'credit-card' },
      { name: 'Investasi & Tabungan', icon: 'landmark' },
      { name: 'Lainnya', icon: 'more-horizontal' },
    ];

    await tx.insert(categories).values(
      defaultCategories.map(cat => ({
        userId: newUser.id,
        name: cat.name,
        icon: cat.icon,
      }))
    );

    return newUser;
  });

  res.status(201).json({ message: 'User registered successfully', data });
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !user.isActive) throw new AppError('Invalid email or password', 401);

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new AppError('Invalid email or password', 401);

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, env.JWT_SECRET, {
    expiresIn: '7d',
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({
    message: 'Logged in successfully',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
});

export const getUser = catchAsync(async (req, res) => {
  if (req.user.id !== req.params.id) throw new AppError('Forbidden', 403);
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
  if (req.user.id !== req.params.id) throw new AppError('Forbidden', 403);
  const { name, email } = req.body;
  const [data] = await db.update(users)
    .set({ name, email })
    .where(eq(users.id, req.params.id))
    .returning({ id: users.id, name: users.name, email: users.email });
  if (!data) throw new AppError('User not found', 404);
  res.json({ data });
});

export const deleteUser = catchAsync(async (req, res) => {
  if (req.user.id !== req.params.id) throw new AppError('Forbidden', 403);
  // ponytail: soft-delete via isActive flag; hard delete on demand
  const [data] = await db.update(users)
    .set({ isActive: false, deletedAt: new Date() })
    .where(eq(users.id, req.params.id))
    .returning({ id: users.id });
  if (!data) throw new AppError('User not found', 404);
  res.json({ message: 'User deactivated' });
});
