import { Router } from 'express';
import { nearbyServicesController, nearbyServicesQuerySchema } from './nearby_services.controller';
import { validateRequest } from '../../middleware/validation.middleware';

const router = Router();

router.get('/', validateRequest({ query: nearbyServicesQuerySchema }), (req, res) =>
  nearbyServicesController.getNearbyServices(req, res)
);

export default router;
