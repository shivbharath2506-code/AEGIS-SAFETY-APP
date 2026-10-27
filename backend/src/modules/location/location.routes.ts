import { Router } from 'express';
import {
  locationController,
  createSessionSchema,
  locationUpdateSchema
} from './location.controller';
import { requireAuth, optionalAuth } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';

const router = Router();

// Create session requires user authentication
router.post(
  '/',
  requireAuth,
  validateRequest({ body: createSessionSchema }),
  (req, res) => locationController.startSession(req, res)
);

router.post(
  '/start',
  requireAuth,
  validateRequest({ body: createSessionSchema }),
  (req, res) => locationController.startSession(req, res)
);

// Get session location: open to owner (via auth) OR recipient with valid unguessable token
router.get('/view', optionalAuth, (req, res) => locationController.getSessionLocation(req, res));
router.get('/:id', optionalAuth, (req, res) => locationController.getSessionLocation(req, res));

// Push updates requires owner auth
router.post(
  '/:id/updates',
  requireAuth,
  validateRequest({ body: locationUpdateSchema }),
  (req, res) => locationController.postLocationUpdate(req, res)
);

// Stop session requires owner auth
router.post('/:id/stop', requireAuth, (req, res) =>
  locationController.stopSession(req, res)
);
router.post('/stop', requireAuth, (req, res) =>
  locationController.stopSession(req, res)
);

export default router;
