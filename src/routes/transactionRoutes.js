import { Router } from 'express';
import { 
  getTransactions, 
  getTransaction, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction,
  getHighestExpenses,
  getFilteredTransactions
} from '../controllers/transactionController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import { transactionSchema, transactionFilterQuerySchema } from '../utils/schemas.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getTransactions);
router.get('/highest', getHighestExpenses);
router.get('/filter', validateQuery(transactionFilterQuerySchema), getFilteredTransactions);
router.get('/:id', getTransaction);
router.post('/', validateBody(transactionSchema), createTransaction);
router.put('/:id', validateBody(transactionSchema), updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
