import { z } from 'zod';

const positiveMoney = z.union([
  z.number().positive('Amount must be greater than 0'),
  z.string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid positive number with up to 2 decimal places')
    .refine((val) => Number(val) > 0, 'Amount must be greater than 0')
]);

const nonNegativeMoney = z.union([
  z.number().nonnegative('Amount cannot be negative'),
  z.string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid non-negative number with up to 2 decimal places')
    .refine((val) => Number(val) >= 0, 'Amount cannot be negative')
]);

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
  balance: nonNegativeMoney.optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  icon: z.string().optional(),
});

export const budgetSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  amount: positiveMoney,
  month: z.string().datetime({ message: 'Month must be a valid ISO datetime string' }).or(z.string().date()),
});

export const transactionSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  categoryId: z.string().uuid('Invalid category ID').nullable().optional(),
  amount: positiveMoney,
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
  targetAmount: positiveMoney,
  currentAmount: nonNegativeMoney.optional(),
  deadline: z.string().datetime().or(z.string().date()).optional(),
  accountId: z.string().uuid('Invalid account ID').optional()
}).superRefine((data, ctx) => {
  if (data.currentAmount !== undefined && Number(data.currentAmount) > 0 && !data.accountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'accountId is required when currentAmount is greater than 0',
      path: ['accountId'],
    });
  }
});

export const transactionFilterQuerySchema = z.object({
  category: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
  year: z.string().regex(/^\d{4}$/, 'Year must be a 4-digit number').optional(),
  month: z.string().regex(/^(0?[1-9]|1[0-2])$/, 'Month must be between 1 and 12').optional(),
  day: z.string().regex(/^(0?[1-9]|[12]\d|3[01])$/, 'Day must be between 1 and 31').optional(),
});
