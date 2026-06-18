import { db } from '../db/index.js';
import { categories } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

export const getCategories = catchAsync(async (req, res) => {
  const data = await db.select().from(categories);
  res.json({ data });
});

export const getCategory = catchAsync(async (req, res) => {
  const [data] = await db.select().from(categories).where(eq(categories.id, req.params.id));
  if (!data) throw new AppError('Category not found', 404);
  res.json({ data });
});

export const createCategory = catchAsync(async (req, res) => {
  const { name } = req.body;
  const [data] = await db.insert(categories).values({ name }).returning();
  res.status(201).json({ data });
});

export const updateCategory = catchAsync(async (req, res) => {
  const { name } = req.body;
  const [data] = await db.update(categories)
    .set({ name })
    .where(eq(categories.id, req.params.id))
    .returning();
  if (!data) throw new AppError('Category not found', 404);
  res.json({ data });
});

export const deleteCategory = catchAsync(async (req, res) => {
  const [data] = await db.delete(categories).where(eq(categories.id, req.params.id)).returning();
  if (!data) throw new AppError('Category not found', 404);
  res.json({ message: 'Category deleted' });
});
