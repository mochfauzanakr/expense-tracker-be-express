import { eq, and, or, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { categories } from '../db/schema.js';
import AppError from '../utils/AppError.js';

export interface CreateCategoryDTO {
  name: string;
  icon?: string;
}

export interface UpdateCategoryDTO {
  name?: string;
  icon?: string;
}

export async function getCategories(userId: string) {
  return db
    .select()
    .from(categories)
    .where(or(eq(categories.userId, userId), isNull(categories.userId)));
}

export async function getCategoryById(id: string, userId: string) {
  const [data] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, id),
        or(eq(categories.userId, userId), isNull(categories.userId))
      )
    );

  if (!data) throw new AppError('Category not found', 404);
  return data;
}

export async function createCategory(userId: string, dto: CreateCategoryDTO) {
  const [data] = await db
    .insert(categories)
    .values({
      userId,
      name: dto.name,
      icon: dto.icon || 'dollar-sign',
    })
    .returning();

  return data;
}

export async function updateCategory(id: string, userId: string, dto: UpdateCategoryDTO) {
  const [data] = await db
    .update(categories)
    .set({
      name: dto.name,
      icon: dto.icon,
    })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();

  if (!data) throw new AppError('Category not found', 404);
  return data;
}

export async function deleteCategory(id: string, userId: string) {
  const [data] = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();

  if (!data) throw new AppError('Category not found', 404);
  return { message: 'Category deleted' };
}
