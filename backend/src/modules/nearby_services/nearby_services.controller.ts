import { Request, Response } from 'express';
import { z } from 'zod';
import { inMemoryStore } from '../../database/inMemoryStore';
import { calculateDistanceMeters } from '../../utils/geo';
import { successResponse } from '../../utils/response';
import { config } from '../../config';
import { FacilityCategory, NearbyFacility } from '../../types';

export const nearbyServicesQuerySchema = z.object({
  latitude: z.string().transform((v) => parseFloat(v)).optional(),
  longitude: z.string().transform((v) => parseFloat(v)).optional(),
  category: z.enum(['POLICE', 'HOSPITAL', 'PHARMACY']).optional(),
  radiusMeters: z.string().transform((v) => parseInt(v, 10)).default('10000')
});

export class NearbyServicesController {
  async getNearbyServices(req: Request, res: Response): Promise<any> {
    const lat = (req.query.latitude as any) || config.DEFAULT_LATITUDE;
    const lng = (req.query.longitude as any) || config.DEFAULT_LONGITUDE;
    const category = req.query.category as FacilityCategory | undefined;
    const radiusMeters = (req.query.radiusMeters as any) || 10000;

    const allFacilities = inMemoryStore.facilities;
    const results: Array<NearbyFacility & { distanceMeters: number; distanceFormatted: string }> = [];

    for (const fac of allFacilities) {
      if (category && fac.category !== category) {
        continue;
      }

      const dist = calculateDistanceMeters(lat, lng, fac.latitude, fac.longitude);
      if (dist <= radiusMeters) {
        results.push({
          ...fac,
          distanceMeters: dist,
          distanceFormatted: dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${dist} m`
        });
      }
    }

    // Sort by closest first
    results.sort((a, b) => a.distanceMeters - b.distanceMeters);

    return successResponse(res, {
      center: { latitude: lat, longitude: lng },
      radiusMeters,
      count: results.length,
      facilities: results
    });
  }
}

export const nearbyServicesController = new NearbyServicesController();
