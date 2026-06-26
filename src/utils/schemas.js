import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
});

export const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  balance: z.union([z.string(), z.number()]).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

export const budgetSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  amount: z.union([z.string(), z.number()]),
  month: z.string().datetime({ message: 'Month must be a valid ISO datetime string' }).or(z.string().date()),
});

export const transactionSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
  amount: z.union([z.string(), z.number()]),
  type: z.enum(['income', 'expense']),
  description: z.string().min(1, 'Description is required'),
}).superRefine((data, ctx) => {
  if (data.type === 'expense' && !data.categoryId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Category is required for expenses',
      path: ['categoryId'],
    });
  }
});

export const savingsGoalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  targetAmount: z.union([z.string(), z.number()]),
  currentAmount: z.union([z.string(), z.number()]).optional(),
  deadline: z.string().datetime().or(z.string().date()).optional(),
  accountId: z.string().uuid('Invalid account ID').optional()
});
