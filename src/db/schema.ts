import { pgTable, uuid, text, decimal, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';


export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  isActive: boolean('is_active').default(true).notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), 
  balance: decimal('balance', { precision: 12, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), 
  icon: text('icon'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(), 
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(), 
  month: timestamp('month').notNull(), 
  createdAt: timestamp('created_at').defaultNow(),
});


export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }).notNull(), 
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(), 
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum('type').notNull(), 
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const savingsGoals = pgTable('savings_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), 
  targetAmount: decimal('target_amount', { precision: 12, scale: 2 }).notNull(),
  currentAmount: decimal('current_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  deadline: timestamp('deadline'), 
  createdAt: timestamp('created_at').defaultNow(),
});

//===================== Mapping Relasi =====================//

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  transactions: many(transactions),
  budgets: many(budgets),
  savingsGoals: many(savingsGoals),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  account: one(accounts, { fields: [transactions.accountId], references: [accounts.id] }),
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
}));