import { Router } from 'express';
import { register, login } from '../controllers/userController.js';
import { validateBody } from '../middlewares/validate.js';
import { registerSchema, loginSchema } from '../utils/schemas.js';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);

export default router;
