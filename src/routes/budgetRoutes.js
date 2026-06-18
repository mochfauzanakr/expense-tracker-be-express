import { Router } from 'express';
import { getBudgets, getBudget, createBudget, updateBudget, deleteBudget } from '../controllers/budgetController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { budgetSchema } from '../utils/schemas.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getBudgets);
router.get('/:id', getBudget);
router.post('/', validateBody(budgetSchema), createBudget);
router.put('/:id', validateBody(budgetSchema), updateBudget);
router.delete('/:id', deleteBudget);

export default router;
