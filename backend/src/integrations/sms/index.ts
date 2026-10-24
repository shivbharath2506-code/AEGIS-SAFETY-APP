import { config } from '../../config';
import { logger } from '../../utils/logger';

export interface SmsSendResult {
  success: boolean;
  providerReference?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface SmsProvider {
  sendEmergencySms(recipientPhone: string, message: string): Promise<SmsSendResult>;
}

export class MockSmsProvider implements SmsProvider {
  async sendEmergencySms(recipientPhone: string, message: string): Promise<SmsSendResult> {
    const reference = `mock-sms-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    logger.info(`[MOCK SMS DISPATCH] Recipient: ${recipientPhone} | Ref: ${reference}`);
    logger.info(`[MOCK SMS CONTENT] ${message}`);
    return {
      success: true,
      providerReference: reference
    };
  }
}

export class Fast2SmsProvider implements SmsProvider {
  private apiKey: string;
  private senderId: string;

  constructor(apiKey: string, senderId: string) {
    this.apiKey = apiKey;
    this.senderId = senderId;
  }

  async sendEmergencySms(recipientPhone: string, message: string): Promise<SmsSendResult> {
    if (!this.apiKey) {
      logger.warn('Fast2SMS API key not configured, routing to mock provider fallback.');
      return new MockSmsProvider().sendEmergencySms(recipientPhone, message);
    }

    try {
      // Clean phone number (strip +91 if needed)
      const cleanedNumber = recipientPhone.replace(/\D/g, '').slice(-10);
      const axios = require('axios');
      const response = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
          route: 'v3',
          sender_id: this.senderId,
          message: message,
          language: 'english',
          flash: 0,
          numbers: cleanedNumber
        },
        {
          headers: {
            authorization: this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      if (response.data && response.data.return) {
        return {
          success: true,
          providerReference: response.data.request_id || `f2s-${Date.now()}`
        };
      } else {
        return {
          success: false,
          errorCode: 'PROVIDER_REJECTED',
          errorMessage: response.data?.message || 'Fast2SMS returned failure'
        };
      }
    } catch (err: any) {
      logger.error('Fast2SMS dispatch error:', { error: err.message });
      return {
        success: false,
        errorCode: 'NETWORK_OR_AUTH_ERROR',
        errorMessage: err.message
      };
    }
  }
}

export class TwilioSmsProvider implements SmsProvider {
  private accountSid?: string;
  private authToken?: string;
  private fromNumber?: string;

  constructor(accountSid?: string, authToken?: string, fromNumber?: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
  }

  async sendEmergencySms(recipientPhone: string, message: string): Promise<SmsSendResult> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      logger.warn('Twilio credentials not fully configured, fallback to mock SMS.');
      return new MockSmsProvider().sendEmergencySms(recipientPhone, message);
    }

    try {
      const axios = require('axios');
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', recipientPhone);
      params.append('From', this.fromNumber);
      params.append('Body', message);

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        params.toString(),
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 5000
        }
      );

      return {
        success: true,
        providerReference: response.data.sid
      };
    } catch (err: any) {
      logger.error('Twilio dispatch error:', { error: err.message });
      return {
        success: false,
        errorCode: 'TWILIO_ERROR',
        errorMessage: err.message
      };
    }
  }
}

export const getSmsProvider = (): SmsProvider => {
  switch (config.SMS_PROVIDER) {
    case 'fast2sms':
      return new Fast2SmsProvider(config.SMS_API_KEY, config.SMS_SENDER_ID);
    case 'twilio':
      return new TwilioSmsProvider(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN, config.TWILIO_FROM_NUMBER);
    case 'mock':
    default:
      return new MockSmsProvider();
  }
};
