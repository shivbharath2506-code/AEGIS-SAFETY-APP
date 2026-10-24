import { Request, Response } from 'express';
import { z } from 'zod';
import { routeEngine } from '../../integrations/maps';
import { successResponse } from '../../utils/response';

export const compareRoutesSchema = z.object({
  originLatitude: z.number().min(-90).max(90),
  originLongitude: z.number().min(-180).max(180),
  destinationLatitude: z.number().min(-90).max(90),
  destinationLongitude: z.number().min(-180).max(180)
});

export class RoutesController {
  async compareRoutes(req: Request, res: Response): Promise<any> {
    const { originLatitude, originLongitude, destinationLatitude, destinationLongitude } = req.body;

    const alternatives = await routeEngine.compareRoutes(
      originLatitude,
      originLongitude,
      destinationLatitude,
      destinationLongitude
    );

    return successResponse(res, {
      origin: { latitude: originLatitude, longitude: originLongitude },
      destination: { latitude: destinationLatitude, longitude: destinationLongitude },
      alternativeCount: alternatives.length,
      routes: alternatives
    });
  }
}

export const routesController = new RoutesController();
