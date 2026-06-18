import { Router } from 'express';
import { register } from '../controllers/userController.js';
import { validateBody } from '../middlewares/validate.js';
import { registerSchema } from '../utils/schemas.js';

const router = Router();

router.post('/register', validateBody(registerSchema), register);

export default router;
