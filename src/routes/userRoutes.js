import { Router } from 'express';
import { getUser, updateUser, deleteUser } from '../controllers/userController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { userUpdateSchema } from '../utils/schemas.js';

const router = Router();

router.use(authenticateToken);

router.get('/:id', getUser);
router.put('/:id', validateBody(userUpdateSchema), updateUser);
router.delete('/:id', deleteUser);

export default router;