import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, accounts, categories } from '../db/schema.js';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
}

export async function registerUser(dto: RegisterDTO) {
  const [existingUser] = await db.select().from(users).where(eq(users.email, dto.email));
  if (existingUser) throw new AppError('User already exists', 400);

  const passwordHash = await bcrypt.hash(dto.password, 10);

  const newUser = await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      name: dto.name,
      email: dto.email,
      passwordHash,
    }).returning();

    await tx.insert(accounts).values({
      userId: user.id,
      name: 'Cash',
      balance: '0',
    });

    const defaultCategories = [
      { name: 'Makanan & Minuman', icon: 'coffee' },
      { name: 'Belanja', icon: 'shopping-bag' },
      { name: 'Transportasi', icon: 'car' },
      { name: 'Tagihan & Utilitas', icon: 'credit-card' },
      { name: 'Investasi & Tabungan', icon: 'landmark' },
      { name: 'Lainnya', icon: 'more-horizontal' },
    ];

    await tx.insert(categories).values(
      defaultCategories.map((cat) => ({
        userId: user.id,
        name: cat.name,
        icon: cat.icon,
      }))
    );

    return user;
  });

  return newUser;
}

export async function loginUser(dto: LoginDTO) {
  const [user] = await db.select().from(users).where(eq(users.email, dto.email));
  if (!user || !user.isActive) throw new AppError('Invalid email or password', 401);

  const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
  if (!isMatch) throw new AppError('Invalid email or password', 401);

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

export async function getUserById(id: string, requestingUserId: string) {
  if (requestingUserId !== id) throw new AppError('Forbidden', 403);

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id));

  if (!user) throw new AppError('User not found', 404);
  return user;
}

export async function updateUser(id: string, requestingUserId: string, dto: UpdateUserDTO) {
  if (requestingUserId !== id) throw new AppError('Forbidden', 403);

  const [updated] = await db
    .update(users)
    .set({ name: dto.name, email: dto.email })
    .where(eq(users.id, id))
    .returning({ id: users.id, name: users.name, email: users.email });

  if (!updated) throw new AppError('User not found', 404);
  return updated;
}

export async function deactivateUser(id: string, requestingUserId: string) {
  if (requestingUserId !== id) throw new AppError('Forbidden', 403);

  const [deactivated] = await db
    .update(users)
    .set({ isActive: false, deletedAt: new Date() })
    .where(eq(users.id, id))
    .returning({ id: users.id });

  if (!deactivated) throw new AppError('User not found', 404);
  return { message: 'User deactivated' };
}
