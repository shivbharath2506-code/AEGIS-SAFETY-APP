import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { config } from '../../config';
import { logger } from '../../utils/logger';

let isInitialized = false;

export function initializeFirebaseAdmin(): App | null {
  const existingApps = getApps();
  if (isInitialized && existingApps.length > 0) {
    return existingApps[0]!;
  }

  try {
    if (existingApps.length > 0) {
      isInitialized = true;
      return existingApps[0]!;
    }

    // 1. If explicit service account credentials are provided
    if (config.FIREBASE_PROJECT_ID && config.FIREBASE_CLIENT_EMAIL && config.FIREBASE_PRIVATE_KEY) {
      const privateKey = config.FIREBASE_PRIVATE_KEY.includes('\\n')
        ? config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : config.FIREBASE_PRIVATE_KEY;

      const app = initializeApp({
        credential: cert({
          projectId: config.FIREBASE_PROJECT_ID,
          clientEmail: config.FIREBASE_CLIENT_EMAIL,
          privateKey
        })
      });
      isInitialized = true;
      logger.info(`[FIREBASE ADMIN] Initialized with Service Account for Project: ${config.FIREBASE_PROJECT_ID}`);
      return app;
    }

    // 2. If Project ID is provided without explicit private key (Token Verification via Google Public Certs)
    if (config.FIREBASE_PROJECT_ID && config.FIREBASE_PROJECT_ID !== 'aegis-dev') {
      const app = initializeApp({
        projectId: config.FIREBASE_PROJECT_ID
      });
      isInitialized = true;
      logger.info(`[FIREBASE ADMIN] Initialized with Project ID: ${config.FIREBASE_PROJECT_ID}`);
      return app;
    }

    // 3. Fallback / Default dev environment
    logger.warn('[FIREBASE ADMIN] Service credentials or production Project ID not fully configured. Operating in dev mode.');
    return null;
  } catch (err: any) {
    logger.error('Failed to initialize Firebase Admin SDK:', { error: err.message });
    return null;
  }
}

export interface VerifiedFirebaseToken {
  uid: string;
  phoneNumber?: string;
  email?: string;
  displayName?: string;
}

export async function verifyFirebaseIdToken(token: string): Promise<VerifiedFirebaseToken> {
  const app = initializeFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin SDK is not initialized. Please configure FIREBASE_PROJECT_ID and credentials.');
  }

  const auth = getAuth(app);
  const decoded = await auth.verifyIdToken(token);
  return {
    uid: decoded.uid,
    phoneNumber: decoded.phone_number,
    email: decoded.email,
    displayName: decoded.name
  };
}

export function isFirebaseConfigured(): boolean {
  return !!(config.FIREBASE_API_KEY && config.FIREBASE_PROJECT_ID && config.FIREBASE_PROJECT_ID !== 'aegis-dev');
}

export function getPublicFirebaseConfig() {
  const projectId = config.FIREBASE_PROJECT_ID && config.FIREBASE_PROJECT_ID !== 'aegis-dev' ? config.FIREBASE_PROJECT_ID : null;
  return {
    isConfigured: !!(config.FIREBASE_API_KEY && projectId),
    apiKey: config.FIREBASE_API_KEY || null,
    authDomain: config.FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : null),
    projectId: projectId,
    storageBucket: config.FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.appspot.com` : null),
    messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID || null,
    appId: config.FIREBASE_APP_ID || null
  };
}
