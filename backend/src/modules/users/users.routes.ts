import { Router } from 'express';
import {
  usersController,
  firebaseLoginSchema,
  requestOtpSchema,
  loginWithPhoneSchema,
  updateProfileSchema
} from './users.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';

const router = Router();

// Public Firebase Authentication Endpoints
router.get('/auth/firebase-config', (req, res) => usersController.getFirebaseConfig(req, res));
router.post('/auth/firebase-login', validateRequest({ body: firebaseLoginSchema }), (req, res) =>
  usersController.firebaseLogin(req, res)
);

// Legacy OTP Endpoints (Maintained for backward-compatible fallback during migration)
router.post('/auth/otp-request', validateRequest({ body: requestOtpSchema }), (req, res) =>
  usersController.requestOtp(req, res)
);

router.post('/auth/login', validateRequest({ body: loginWithPhoneSchema }), (req, res) =>
  usersController.loginWithPhone(req, res)
);

// Authenticated Endpoints
router.use(requireAuth);

router.get('/me', (req, res) => usersController.getProfile(req, res));
router.get('/profile', (req, res) => usersController.getProfile(req, res));
router.patch('/me', validateRequest({ body: updateProfileSchema }), (req, res) =>
  usersController.updateProfile(req, res)
);
router.delete('/me', (req, res) => usersController.deleteAccount(req, res));

export default router;
