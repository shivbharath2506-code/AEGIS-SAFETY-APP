import { Router } from 'express';
import { sosController, triggerSosSchema, resolveSosSchema } from './sos.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { sosRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.use(requireAuth);

// Trigger SOS via POST / or POST /trigger
router.post(
  '/',
  sosRateLimiter,
  validateRequest({ body: triggerSosSchema }),
  (req, res) => sosController.triggerSos(req, res)
);
router.post(
  '/trigger',
  sosRateLimiter,
  validateRequest({ body: triggerSosSchema }),
  (req, res) => sosController.triggerSos(req, res)
);

router.get('/', (req, res) => sosController.getAlertHistory(req, res));
router.get('/:id', (req, res) => sosController.getAlertById(req, res));

// Resolve SOS via POST /:id/resolve or POST /resolve with { alertId }
router.post(
  '/:id/resolve',
  validateRequest({ body: resolveSosSchema }),
  (req, res) => sosController.resolveAlert(req, res)
);
router.post(
  '/resolve',
  validateRequest({ body: resolveSosSchema }),
  (req, res) => sosController.resolveAlert(req, res)
);

router.get('/:id/deliveries', (req, res) => sosController.getAlertDeliveries(req, res));

// Outbound Emergency Call
router.post('/call', (req, res) => sosController.triggerCallToContact(req, res));
router.post('/:id/call', (req, res) => sosController.triggerCallToContact(req, res));

export default router;
