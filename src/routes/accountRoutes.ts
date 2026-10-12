import { Router } from 'express';
import { getAccounts, getAccount, createAccount, updateAccount, deleteAccount } from '../controllers/accountController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { accountSchema } from '../utils/schemas.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getAccounts);
router.get('/:id', getAccount);
router.post('/', validateBody(accountSchema), createAccount);
router.put('/:id', validateBody(accountSchema), updateAccount);
router.delete('/:id', deleteAccount);

export default router;
