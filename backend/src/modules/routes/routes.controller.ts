import { Request, Response } from 'express';
import { z } from 'zod';
import { routeEngine } from '../../integrations/maps';
import { successResponse } from '../../utils/response';

export const compareRoutesSchema = z.object({
  originLatitude: z.number().min(-90).max(90).optional(),
  originLongitude: z.number().min(-180).max(180).optional(),
  destinationLatitude: z.number().min(-90).max(90).optional(),
  destinationLongitude: z.number().min(-180).max(180).optional(),
  originLat: z.number().min(-90).max(90).optional(),
  originLng: z.number().min(-180).max(180).optional(),
  destLat: z.number().min(-90).max(90).optional(),
  destLng: z.number().min(-180).max(180).optional()
});

export class RoutesController {
  async compareRoutes(req: Request, res: Response): Promise<any> {
    const origLat = req.body.originLatitude ?? req.body.originLat;
    const origLng = req.body.originLongitude ?? req.body.originLng;
    const destLat = req.body.destinationLatitude ?? req.body.destLat;
    const destLng = req.body.destinationLongitude ?? req.body.destLng;

    if (
      typeof origLat !== 'number' ||
      typeof origLng !== 'number' ||
      typeof destLat !== 'number' ||
      typeof destLng !== 'number'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination coordinates (latitude and longitude) are required.'
      });
    }

    const alternatives = await routeEngine.compareRoutes(
      origLat,
      origLng,
      destLat,
      destLng
    );

    const safeAlt = alternatives[0];
    const fastAlt = alternatives.length > 1 ? alternatives[1] : alternatives[0];

    const formatRoute = (r: typeof safeAlt, scoreFallback: number) => ({
      name: r.name,
      distanceMeters: r.distanceMeters,
      estimatedDurationSeconds: r.durationSeconds,
      safetyScore: r.safetyAssessment.safetyScore ? Math.round(r.safetyAssessment.safetyScore * 10) : scoreFallback,
      safetyBreakdown: {
        lightingFactor: r.safetyAssessment.scoringFactors.lightingAvailabilityRatio,
        facilityDensityFactor: r.safetyAssessment.scoringFactors.verifiedFacilitiesNearbyCount / 5,
        isolationPenalty: r.safetyAssessment.scoringFactors.hasIsolatedWarnings ? 0.2 : 0
      },
      polyline: r.coordinates.map((c) => ({ lat: c.latitude, lng: c.longitude }))
    });

    return successResponse(res, {
      origin: { latitude: origLat, longitude: origLng },
      destination: { latitude: destLat, longitude: destLng },
      alternativeCount: alternatives.length,
      routes: alternatives,
      recommendedSafeRoute: formatRoute(safeAlt, 88),
      fastestAlternative: formatRoute(fastAlt, 62)
    });
  }
}

export const routesController = new RoutesController();
