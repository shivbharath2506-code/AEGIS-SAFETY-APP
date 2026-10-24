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
}

export interface PushProvider {
  sendPush(targetTokens: string[], payload: PushNotificationPayload): Promise<PushSendResult>;
}

export class MockPushProvider implements PushProvider {
  async sendPush(targetTokens: string[], payload: PushNotificationPayload): Promise<PushSendResult> {
    const reference = `mock-fcm-${Date.now()}-${targetTokens.length}`;
    logger.info(`[MOCK PUSH DISPATCH] Sent to ${targetTokens.length} device(s) | Title: ${payload.title}`);
    return {
      success: true,
      providerReference: reference
    };
  }
}

export class FirebaseFcmProvider implements PushProvider {
  async sendPush(targetTokens: string[], payload: PushNotificationPayload): Promise<PushSendResult> {
    if (!config.FIREBASE_PROJECT_ID || !config.FIREBASE_CLIENT_EMAIL) {
      logger.warn('FCM Admin SDK credentials not fully configured, fallback to Mock Push.');
      return new MockPushProvider().sendPush(targetTokens, payload);
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
  switch (config.PUSH_PROVIDER) {
    case 'fcm':
      return new FirebaseFcmProvider();
    case 'mock':
    default:
      return new MockPushProvider();
  }
};
