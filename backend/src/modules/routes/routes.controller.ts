import { Request, Response } from 'express';
import { z } from 'zod';
import { routeEngine } from '../../integrations/maps';
import { successResponse } from '../../utils/response';
import { placesService } from './places.service';

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

export const searchPlacesQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  lat: z.string().optional().transform((v) => (v ? parseFloat(v) : undefined)),
  lng: z.string().optional().transform((v) => (v ? parseFloat(v) : undefined))
});

export const reverseGeocodeQuerySchema = z.object({
  lat: z
    .string()
    .transform((v) => parseFloat(v))
    .refine((v) => !isNaN(v) && v >= -90 && v <= 90, 'Valid latitude required'),
  lng: z
    .string()
    .transform((v) => parseFloat(v))
    .refine((v) => !isNaN(v) && v >= -180 && v <= 180, 'Valid longitude required')
});

export class RoutesController {
  /**
   * Search for any real-world place (theatre, apartment, office, etc.)
   */
  async searchPlaces(req: Request, res: Response): Promise<any> {
    const q = (req.query.q as string) || '';
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

    if (!q.trim()) {
      return successResponse(res, { query: q, results: [] });
    }

    const results = await placesService.searchPlaces(q, lat, lng);
    return successResponse(res, {
      query: q,
      count: results.length,
      results
    });
  }

  /**
   * Reverse geocode GPS coordinates to place/street name
   */
  async reverseGeocode(req: Request, res: Response): Promise<any> {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Valid numeric lat and lng query parameters are required.'
      });
    }

    const result = await placesService.reverseGeocode(lat, lng);
    return successResponse(res, result);
  }

  /**
   * Compare routes between any arbitrary origin and destination coordinates
   */
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

    const formatRoute = (r: typeof safeAlt, scoreFallback: number) => {
      const isInsufficient = r.safetyAssessment.confidenceLabel === 'INSUFFICIENT_DATA';
      const score =
        r.safetyAssessment.safetyScore !== null
          ? Math.round(r.safetyAssessment.safetyScore * 10)
          : (isInsufficient ? null : scoreFallback);

      const lightingRatio = r.safetyAssessment.scoringFactors.lightingAvailabilityRatio;
      const facilitiesCount = r.safetyAssessment.scoringFactors.verifiedFacilitiesNearbyCount;

      return {
        name: r.name,
        distanceMeters: r.distanceMeters,
        estimatedDurationSeconds: r.durationSeconds,
        safetyScore: score,
        confidenceLabel: r.safetyAssessment.confidenceLabel,
        isGuaranteedSafe: false,
        isDataVerified: !isInsufficient,
        lightingAudit:
          lightingRatio > 0.5
            ? `${Math.round(lightingRatio * 100)}% Audited Illumination`
            : lightingRatio > 0
            ? 'Partially Audited'
            : 'Data unavailable / Not verified',
        facilitiesCount,
        facilitySummary: r.facilitySummary,
        corridorFacilities: r.corridorFacilities,
        safetyBreakdown: {
          lightingFactor: lightingRatio,
          facilityDensityFactor: Math.min(1.0, facilitiesCount / 5),
          isolationPenalty: r.safetyAssessment.scoringFactors.hasIsolatedWarnings ? 0.2 : 0
        },
        transparencyNote: r.safetyAssessment.scoringFactors.transparencyNote,
        navigationHandoffUrl: r.navigationHandoffUrl,
        polyline: r.coordinates.map((c) => ({ lat: c.latitude, lng: c.longitude }))
      };
    };

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
