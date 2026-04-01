import { Router } from 'express';
import { userController } from './user.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { updateUserSchema } from './user.schema.js';

const router = Router();

// All user management routes require authentication + ADMIN role
router.use(authenticate, authorize('ADMIN'));

router.get('/', userController.listUsers);
router.get('/:id', userController.getUserById);
router.patch('/:id', validate(updateUserSchema), userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;
