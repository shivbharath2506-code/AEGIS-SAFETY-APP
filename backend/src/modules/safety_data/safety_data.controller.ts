import { Request, Response } from 'express';
import { inMemoryStore } from '../../database/inMemoryStore';
import { successResponse } from '../../utils/response';

export class SafetyDataController {
  async getSafetyData(req: Request, res: Response): Promise<any> {
    const category = req.query.category as string | undefined;

    let items = inMemoryStore.safetyData;
    if (category) {
      items = items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
    }

    return successResponse(res, {
      count: items.length,
      city: 'Chennai',
      state: 'Tamil Nadu',
      points: items
    });
  }

  async getSafetyMetadata(req: Request, res: Response): Promise<any> {
    return successResponse(res, {
      jurisdiction: 'Chennai Metropolitan Area (CMDA)',
      datasets: [
        {
          id: 'chennai-corp-lighting',
          name: 'Greater Chennai Corporation Smart LED Streetlighting Audit',
          source: 'Chennai Smart City Corporation / Public Works Department',
          type: 'LIGHTING',
          confidence: 'AUTHORITATIVE',
          coverage: 'Inner Ring Road, Mount-Poonamallee High Rd, Anna Salai',
          lastUpdated: '2025-11-15T00:00:00.000Z',
          disclaimer: 'Assesses physical illumination infrastructure only; does not predict crime incidence or safety guarantee.'
        },
        {
          id: 'cmda-pedestrian-density',
          name: 'CMDA Transit Corridor Footfall & Bus Terminus Density Index',
          source: 'Chennai Unified Metropolitan Transport Authority (CUMTA)',
          type: 'CROWD',
          confidence: 'LICENSED_OPEN',
          coverage: 'Koyambedu, Guindy, Vadapalani, Central, Tambaram',
          lastUpdated: '2025-10-01T00:00:00.000Z',
          disclaimer: 'Reflects historical transit movement frequency; low footfall does not by itself define hazard.'
        },
        {
          id: 'community-safety-reports',
          name: 'Moderated Community Hazard & Canal Isolation Reports',
          source: 'AEGIS Moderated Citizen Safety Submissions',
          type: 'ISOLATED_AREA',
          confidence: 'COMMUNITY_VERIFIED',
          coverage: 'Selected Service Lanes, Cooum Canal By-lanes, Unpaved Segments',
          lastUpdated: '2026-01-20T00:00:00.000Z',
          disclaimer: 'Crowdsourced observations reviewed for moderation; transient environmental conditions may change.'
        }
      ]
    });
  }
}

export const safetyDataController = new SafetyDataController();
