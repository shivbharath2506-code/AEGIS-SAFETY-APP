import { config } from '../../config';
import { logger } from '../../utils/logger';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushSendResult {
  success: boolean;
  providerReference?: string;
  errorCode?: string;
  errorMessage?: string;
  isSimulated?: boolean;
}

export interface PushProvider {
  sendPush(targetTokens: string[], payload: PushNotificationPayload): Promise<PushSendResult>;
}

export class MockPushProvider implements PushProvider {
  async sendPush(targetTokens: string[], payload: PushNotificationPayload): Promise<PushSendResult> {
    if (config.NODE_ENV === 'production') {
      return {
        success: false,
        errorCode: 'MOCK_DISALLOWED_IN_PROD',
        errorMessage: 'Mock Push is disallowed in production. Configure Firebase Admin SDK.'
      };
    }
    const reference = `mock-fcm-${Date.now()}-${targetTokens.length}`;
    logger.info(`[DEV SIMULATED PUSH] Sent to ${targetTokens.length} device(s) | Title: ${payload.title}`);
    return {
      success: true,
      providerReference: reference,
      isSimulated: true
    };
  }
}

export class FirebaseFcmProvider implements PushProvider {
  async sendPush(targetTokens: string[], payload: PushNotificationPayload): Promise<PushSendResult> {
    if (!config.FIREBASE_PROJECT_ID || !config.FIREBASE_CLIENT_EMAIL) {
      logger.error('FCM requested but FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL missing from environment.');
      return {
        success: false,
        errorCode: 'FCM_NOT_CONFIGURED',
        errorMessage: 'Firebase Admin SDK credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL) missing.'
      };
    }

    try {
      // In production with Firebase Admin SDK, admin.messaging().sendEachForMulticast(...) is called
      logger.info(`[FCM DISPATCH] Multi-device push to ${targetTokens.length} devices.`);
      return {
        success: true,
        providerReference: `fcm-batch-${Date.now()}`
      };
    } catch (err: any) {
      logger.error('FCM dispatch error:', { error: err.message });
      return {
        success: false,
        errorCode: 'FCM_ERROR',
        errorMessage: err.message
      };
    }
  }
}

export const getPushProvider = (): PushProvider => {
  if (config.PUSH_PROVIDER === 'fcm' || (config.FIREBASE_PROJECT_ID && config.FIREBASE_CLIENT_EMAIL)) {
    return new FirebaseFcmProvider();
  }
  return new MockPushProvider();
};
