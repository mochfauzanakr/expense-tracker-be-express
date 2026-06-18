import { Router } from 'express';
import { getCategories, getCategory, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { categorySchema } from '../utils/schemas.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getCategories);
router.get('/:id', getCategory);
router.post('/', validateBody(categorySchema), createCategory);
router.put('/:id', validateBody(categorySchema), updateCategory);
router.delete('/:id', deleteCategory);

export default router;
