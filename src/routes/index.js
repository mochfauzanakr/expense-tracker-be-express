import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import accountRoutes from './accountRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import budgetRoutes from './budgetRoutes.js';
import transactionRoutes from './transactionRoutes.js';
import savingsGoalRoutes from './savingsGoalRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/accounts', accountRoutes);
router.use('/categories', categoryRoutes);
router.use('/budgets', budgetRoutes);
router.use('/transactions', transactionRoutes);
router.use('/savings-goals', savingsGoalRoutes);

export default router;
