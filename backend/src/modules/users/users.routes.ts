import { Router } from 'express';
import { usersController, updateProfileSchema } from './users.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';

const router = Router();

router.use(requireAuth);

router.get('/me', (req, res) => usersController.getProfile(req, res));
router.patch('/me', validateRequest({ body: updateProfileSchema }), (req, res) =>
  usersController.updateProfile(req, res)
);
router.delete('/me', (req, res) => usersController.deleteAccount(req, res));

export default router;
