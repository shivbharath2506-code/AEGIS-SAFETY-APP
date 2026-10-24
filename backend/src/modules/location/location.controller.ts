import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { inMemoryStore } from '../../database/inMemoryStore';
import { generateSecureToken, hashToken } from '../../utils/crypto';
import { successResponse, errorResponse } from '../../utils/response';
import { config } from '../../config';
import { LocationSession, LocationUpdate } from '../../types';

export const createSessionSchema = z.object({
  durationMinutes: z.number().min(5).max(480).default(60),
  initialLatitude: z.number().optional(),
  initialLongitude: z.number().optional(),
  accuracyMeters: z.number().optional()
});

export const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().optional()
});

export class LocationController {
  async startSession(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;
    const { durationMinutes, initialLatitude, initialLongitude, accuracyMeters } = req.body;

    // Generate unguessable random raw token and SHA256 hash
    const rawToken = generateSecureToken(24);
    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const session: LocationSession = {
      id: uuidv4(),
      user_id: userId,
      token_hash: tokenHash,
      raw_token: rawToken,
      is_active: true,
      started_at: new Date(),
      expires_at: expiresAt,
      stopped_at: null
    };

    inMemoryStore.sessions.set(session.id, session);
    inMemoryStore.locationUpdates.set(session.id, []);

    // Record initial location if provided
    if (typeof initialLatitude === 'number' && typeof initialLongitude === 'number') {
      const initialUpdate: LocationUpdate = {
        id: uuidv4(),
        location_session_id: session.id,
        latitude: initialLatitude,
        longitude: initialLongitude,
        accuracy_meters: accuracyMeters ?? null,
        captured_at: new Date()
      };
      inMemoryStore.locationUpdates.get(session.id)!.push(initialUpdate);
    }

    const shareUrl = `${config.LOCATION_PUBLIC_BASE_URL}?session=${session.id}&token=${rawToken}`;

    return successResponse(
      res,
      {
        sessionId: session.id,
        shareUrl,
        rawToken,
        startedAt: session.started_at,
        expiresAt: session.expires_at,
        durationMinutes
      },
      'Live location sharing session created securely.',
      201
    );
  }

  async getSessionLocation(req: Request, res: Response): Promise<any> {
    const id = req.params.id as string;
    const token = (req.query.token as string) || (req.headers['x-session-token'] as string);
    const session = inMemoryStore.sessions.get(id);

    if (!session) {
      return errorResponse(res, 'NOT_FOUND', 'Live location session not found.', 404);
    }

    // Access authorization:
    // Authorized if either:
    // 1) Authenticated user is the owner
    // 2) Request includes the valid unguessable raw_token
    const isOwner = req.user && req.user.id === session.user_id;
    const isValidToken = token && hashToken(token) === session.token_hash;

    if (!isOwner && !isValidToken) {
      return errorResponse(
        res,
        'FORBIDDEN',
        'Valid access token required to view this private live location session.',
        403
      );
    }

    // Check expiry
    const now = new Date();
    const isExpired = now > session.expires_at || !session.is_active;

    const updates = inMemoryStore.locationUpdates.get(id) || [];
    const latestUpdate = updates.length > 0 ? updates[updates.length - 1] : null;

    return successResponse(res, {
      sessionId: session.id,
      isActive: session.is_active && !isExpired,
      isExpired,
      expiresAt: session.expires_at,
      latestLocation: latestUpdate
        ? {
            latitude: latestUpdate.latitude,
            longitude: latestUpdate.longitude,
            accuracyMeters: latestUpdate.accuracy_meters,
            capturedAt: latestUpdate.captured_at
          }
        : null
    });
  }

  async postLocationUpdate(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const session = inMemoryStore.sessions.get(id);

    if (!session) {
      return errorResponse(res, 'NOT_FOUND', 'Location session not found.', 404);
    }

    if (session.user_id !== userId) {
      return errorResponse(res, 'FORBIDDEN', 'Access denied to this session.', 403);
    }

    if (!session.is_active || new Date() > session.expires_at) {
      return errorResponse(res, 'SESSION_INACTIVE', 'This sharing session has ended or expired.', 410);
    }

    const { latitude, longitude, accuracyMeters } = req.body;

    const update: LocationUpdate = {
      id: uuidv4(),
      location_session_id: session.id,
      latitude,
      longitude,
      accuracy_meters: accuracyMeters ?? null,
      captured_at: new Date()
    };

    if (!inMemoryStore.locationUpdates.has(session.id)) {
      inMemoryStore.locationUpdates.set(session.id, []);
    }
    inMemoryStore.locationUpdates.get(session.id)!.push(update);

    return successResponse(res, {
      updateId: update.id,
      capturedAt: update.captured_at
    }, 'Location updated successfully.');
  }

  async stopSession(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const session = inMemoryStore.sessions.get(id);

    if (!session) {
      return errorResponse(res, 'NOT_FOUND', 'Location session not found.', 404);
    }

    if (session.user_id !== userId) {
      return errorResponse(res, 'FORBIDDEN', 'Access denied to this session.', 403);
    }

    session.is_active = false;
    session.stopped_at = new Date();

    return successResponse(res, {
      sessionId: session.id,
      stoppedAt: session.stopped_at
    }, 'Location sharing session terminated.');
  }
}

export const locationController = new LocationController();
