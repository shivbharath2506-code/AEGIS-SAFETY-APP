import { Router } from 'express';
import { routesController, compareRoutesSchema } from './routes.controller';
import { validateRequest } from '../../middleware/validation.middleware';

const router = Router();

router.post('/compare', validateRequest({ body: compareRoutesSchema }), (req, res) =>
  routesController.compareRoutes(req, res)
);

export default router;
