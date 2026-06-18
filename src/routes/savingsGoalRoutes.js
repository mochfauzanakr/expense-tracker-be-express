import { Router } from 'express';
import { getSavingsGoals, getSavingsGoal, createSavingsGoal, updateSavingsGoal, deleteSavingsGoal } from '../controllers/savingsGoalController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { savingsGoalSchema } from '../utils/schemas.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getSavingsGoals);
router.get('/:id', getSavingsGoal);
router.post('/', validateBody(savingsGoalSchema), createSavingsGoal);
router.put('/:id', validateBody(savingsGoalSchema), updateSavingsGoal);
router.delete('/:id', deleteSavingsGoal);

export default router;
