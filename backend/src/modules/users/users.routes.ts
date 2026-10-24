import { Router } from 'express';
import {
  usersController,
  requestOtpSchema,
  loginWithPhoneSchema,
  updateProfileSchema
} from './users.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';

const router = Router();

// Public Authentication Endpoints
router.post('/auth/otp-request', validateRequest({ body: requestOtpSchema }), (req, res) =>
  usersController.requestOtp(req, res)
);

router.post('/auth/login', validateRequest({ body: loginWithPhoneSchema }), (req, res) =>
  usersController.loginWithPhone(req, res)
);

// Authenticated Endpoints
router.use(requireAuth);

router.get('/me', (req, res) => usersController.getProfile(req, res));
router.patch('/me', validateRequest({ body: updateProfileSchema }), (req, res) =>
  usersController.updateProfile(req, res)
);
router.delete('/me', (req, res) => usersController.deleteAccount(req, res));

export default router;
