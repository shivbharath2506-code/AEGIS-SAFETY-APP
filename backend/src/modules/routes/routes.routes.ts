import { Router } from 'express';
import {
  routesController,
  compareRoutesSchema,
  searchPlacesQuerySchema,
  reverseGeocodeQuerySchema
} from './routes.controller';
import { validateRequest } from '../../middleware/validation.middleware';

const router = Router();

// Place Autocomplete / Search endpoint
router.get(
  '/places/search',
  validateRequest({ query: searchPlacesQuerySchema }),
  (req, res) => routesController.searchPlaces(req, res)
);

// Reverse geocoding endpoint for GPS coordinates
router.get(
  '/places/reverse',
  validateRequest({ query: reverseGeocodeQuerySchema }),
  (req, res) => routesController.reverseGeocode(req, res)
);

// Route Comparison endpoint
router.post(
  '/compare',
  validateRequest({ body: compareRoutesSchema }),
  (req, res) => routesController.compareRoutes(req, res)
);

export default router;
