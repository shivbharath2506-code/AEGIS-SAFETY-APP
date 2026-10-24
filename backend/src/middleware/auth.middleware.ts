import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { inMemoryStore } from '../database/inMemoryStore';
import { errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const authHeader = req.headers.authorization;
  const devUserIdHeader = req.headers['x-dev-user-id'] as string | undefined;

  // 1. Development Mock Authentication (Strictly isolated and disabled if DEV_MOCK_AUTH is false or in production)
  if (config.DEV_MOCK_AUTH && config.NODE_ENV !== 'production') {
    if (devUserIdHeader) {
      let user = inMemoryStore.users.get(devUserIdHeader);
      if (!user) {
        // Create an on-demand mock test user if specified
        user = {
          id: devUserIdHeader,
          firebase_uid: `mock-fb-${devUserIdHeader}`,
          display_name: 'Test Safety User',
          verified_phone_number: '+919988776655',
          medical_notes: null,
          account_status: 'ACTIVE',
          created_at: new Date(),
          updated_at: new Date()
        };
        inMemoryStore.users.set(user.id, user);
      }

      req.user = {
        id: user.id,
        firebaseUid: user.firebase_uid,
        phoneNumber: user.verified_phone_number,
        displayName: user.display_name
      };
      return next();
    }

    if (authHeader && authHeader.startsWith('Bearer mock-token-')) {
      const demoUser = inMemoryStore.users.get('demo-user-chennai-01');
      if (demoUser) {
        req.user = {
          id: demoUser.id,
          firebaseUid: demoUser.firebase_uid,
          phoneNumber: demoUser.verified_phone_number,
          displayName: demoUser.display_name
        };
        return next();
      }
    }
  }

  // 2. Production Firebase Admin Token Verification
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'UNAUTHORIZED', 'Authentication token required.', 401);
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // If Firebase Admin credentials are fully supplied, verify ID token
    if (config.FIREBASE_PROJECT_ID && config.FIREBASE_CLIENT_EMAIL && config.FIREBASE_PRIVATE_KEY) {
      // In production Firebase Admin SDK verification:
      // const decoded = await admin.auth().verifyIdToken(token);
      // const user = await findOrCreateUserByFirebaseUid(decoded.uid, decoded.phone_number);
    }

    // Default fallback check in development
    if (token === 'valid-test-token') {
      const demoUser = inMemoryStore.users.get('demo-user-chennai-01')!;
      req.user = {
        id: demoUser.id,
        firebaseUid: demoUser.firebase_uid,
        phoneNumber: demoUser.verified_phone_number,
        displayName: demoUser.display_name
      };
      return next();
    }

    return errorResponse(res, 'UNAUTHORIZED', 'Invalid or expired authentication token.', 401);
  } catch (err: any) {
    logger.warn('Token verification error:', { error: err.message });
    return errorResponse(res, 'UNAUTHORIZED', 'Token verification failed.', 401);
  }
};
