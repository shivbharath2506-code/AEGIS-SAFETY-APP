import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export interface SmsSendResult {
  success: boolean;
  providerReference?: string;
  errorCode?: string;
  errorMessage?: string;
  isSimulated?: boolean;
}

export interface SmsProvider {
  sendEmergencySms(recipientPhone: string, message: string): Promise<SmsSendResult>;
  sendOtp(recipientPhone: string, otpCode: string): Promise<SmsSendResult>;
}

export function normalizePhoneNumber(phone: string): { formatted: string; rawClean: string; isValid: boolean } {
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  // Indian 10-digit without country code (starts with 6, 7, 8, or 9)
  if (/^[6-9]\d{9}$/.test(clean)) {
    return { formatted: `+91${clean}`, rawClean: clean, isValid: true };
  }
  // Indian 12-digit with 91 prefix
  if (/^91[6-9]\d{9}$/.test(clean)) {
    return { formatted: `+${clean}`, rawClean: clean.slice(2), isValid: true };
  }
  // Indian with +91 prefix
  if (/^\+91[6-9]\d{9}$/.test(clean)) {
    return { formatted: clean, rawClean: clean.slice(3), isValid: true };
  }
  // Other E.164 international numbers
  if (/^\+[1-9]\d{7,14}$/.test(clean)) {
    return { formatted: clean, rawClean: clean.replace(/\D/g, ''), isValid: true };
  }
  return { formatted: clean, rawClean: clean.replace(/\D/g, ''), isValid: false };
}

export function maskPhone(phone: string): string {
  const norm = normalizePhoneNumber(phone);
  if (norm.rawClean.length >= 4) {
    return `+91 ******${norm.rawClean.slice(-4)}`;
  }
  return '******';
}

export class MockSmsProvider implements SmsProvider {
  async sendEmergencySms(recipientPhone: string, message: string): Promise<SmsSendResult> {
    if (config.NODE_ENV === 'production') {
      logger.error('CRITICAL: Attempted to use MockSmsProvider in production.');
      return {
        success: false,
        errorCode: 'MOCK_DISALLOWED_IN_PROD',
        errorMessage: 'Mock SMS is disallowed in production. Configure a real provider (Twilio or Fast2SMS).'
      };
    }
    const reference = `mock-sms-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    logger.info(`[DEV SIMULATED SMS] Recipient: ${maskPhone(recipientPhone)} | Ref: ${reference}`);
    logger.info(`[DEV SIMULATED CONTENT] ${message}`);
    return {
      success: true,
      providerReference: reference,
      isSimulated: true
    };
  }

  async sendOtp(recipientPhone: string, otpCode: string): Promise<SmsSendResult> {
    const reference = `mock-otp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    logger.info(`[REAL-TIME OTP SMS] Recipient: ${maskPhone(recipientPhone)} | Ref: ${reference}`);
    return {
      success: true,
      providerReference: reference,
      isSimulated: true
    };
  }
}

export class Fast2SmsProvider implements SmsProvider {
  private apiKey: string;
  private senderId: string;
  private otpId?: string;

  constructor(apiKey: string, senderId: string, otpId?: string) {
    this.apiKey = apiKey;
    this.senderId = senderId;
    this.otpId = otpId;
  }

  async sendEmergencySms(recipientPhone: string, message: string): Promise<SmsSendResult> {
    if (!this.apiKey) {
      logger.error('Fast2SMS requested but SMS_API_KEY / FAST2SMS_API_KEY is not configured in environment.');
      return {
        success: false,
        errorCode: 'FAST2SMS_NOT_CONFIGURED',
        errorMessage: 'Fast2SMS API key is missing from server environment.'
      };
    }

    try {
      const norm = normalizePhoneNumber(recipientPhone);
      const cleanedNumber = norm.rawClean.slice(-10);
      const masked = maskPhone(recipientPhone);

      // Fast2SMS Quick SMS / Bulk SMS API v3
      const response = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
          route: 'v3',
          sender_id: this.senderId || 'AEGISS',
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
          timeout: 7000
        }
      );

      if (response.data && response.data.return) {
        logger.info(`[FAST2SMS DISPATCH SUCCESS] Sent to ${masked} | Ref: ${response.data.request_id}`);
        return {
          success: true,
          providerReference: response.data.request_id || `f2s-${Date.now()}`
        };
      } else {
        const rawMsg = response.data?.message;
        const errMsg = Array.isArray(rawMsg) ? rawMsg.join(', ') : (rawMsg || 'Fast2SMS returned failure response');
        logger.warn(`[FAST2SMS REJECTION] ${errMsg}`);

        // In development/test mode, gracefully fallback to simulated dispatch if provider rejects
        // (e.g. account requires 100 INR wallet recharge on fast2sms.com)
        if (config.NODE_ENV !== 'production') {
          logger.info(`[FAST2SMS DEV FALLBACK] Fast2SMS requires recharge or rejected (${errMsg}). Falling back to simulated delivery in dev mode.`);
          return {
            success: true,
            providerReference: `simulated-fallback-${Date.now()}`,
            isSimulated: true,
            errorMessage: errMsg
          };
        }

        return {
          success: false,
          errorCode: 'PROVIDER_REJECTED',
          errorMessage: errMsg
        };
      }
    } catch (err: any) {
      const rawMsg = err.response?.data?.message;
      const errMsg = Array.isArray(rawMsg) ? rawMsg.join(', ') : (rawMsg || err.message);
      logger.error('Fast2SMS dispatch error:', { error: errMsg });

      if (config.NODE_ENV !== 'production') {
        logger.info(`[FAST2SMS DEV FALLBACK] Fast2SMS connection error (${errMsg}). Falling back to simulated delivery in dev mode.`);
        return {
          success: true,
          providerReference: `simulated-fallback-${Date.now()}`,
          isSimulated: true,
          errorMessage: errMsg
        };
      }

      return {
        success: false,
        errorCode: 'NETWORK_OR_AUTH_ERROR',
        errorMessage: errMsg
      };
    }
  }

  async sendOtp(recipientPhone: string, otpCode: string): Promise<SmsSendResult> {
    if (!this.apiKey) {
      logger.error('Fast2SMS requested but SMS_API_KEY / FAST2SMS_API_KEY is not configured in environment.');
      return {
        success: false,
        errorCode: 'FAST2SMS_NOT_CONFIGURED',
        errorMessage: 'Fast2SMS API key is missing from server environment.'
      };
    }

    const norm = normalizePhoneNumber(recipientPhone);
    const cleanedNumber = norm.rawClean.slice(-10);
    const masked = maskPhone(recipientPhone);

    // 1. If FAST2SMS_OTP_ID is configured, dispatch via Fast2SMS Smart OTP endpoint
    if (this.otpId) {
      if (this.otpId === this.apiKey || this.otpId.length > 30) {
        logger.warn('[FAST2SMS WARNING] FAST2SMS_OTP_ID appears to be an API key rather than a Smart OTP Template ID.');
      } else {
        try {
          const smartOtpRes = await axios.post(
            'https://www.fast2sms.com/dev/otp/send',
            {
              mobile: cleanedNumber,
              otp_id: this.otpId,
              otp: otpCode
            },
            {
              headers: {
                authorization: this.apiKey,
                'Content-Type': 'application/json'
              },
              timeout: 7000
            }
          );

          if (smartOtpRes.data && smartOtpRes.data.return) {
            logger.info(`[FAST2SMS SMART OTP SUCCESS] Sent to ${masked} | Ref: ${smartOtpRes.data.request_id}`);
            return {
              success: true,
              providerReference: smartOtpRes.data.request_id || `f2s-smart-${Date.now()}`
            };
          }

          const smartErrMsg = Array.isArray(smartOtpRes.data?.message)
            ? smartOtpRes.data.message.join(', ')
            : (smartOtpRes.data?.message || 'Smart OTP provider rejected request');
          logger.warn(`[FAST2SMS SMART OTP REJECTION] ${smartErrMsg}`);
        } catch (smartErr: any) {
          const smartErrMsg = Array.isArray(smartErr.response?.data?.message)
            ? smartErr.response.data.message.join(', ')
            : (smartErr.response?.data?.message || smartErr.message);
          const status = smartErr.response?.status;
          logger.warn(`[FAST2SMS SMART OTP ERROR] Status ${status}: ${smartErrMsg}`);
        }
      }
    }

    // 2. Dispatch via Fast2SMS bulkV2 route: 'otp'
    try {
      const response = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
          route: 'otp',
          variables_values: otpCode,
          numbers: cleanedNumber
        },
        {
          headers: {
            authorization: this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 7000
        }
      );

      if (response.data && response.data.return) {
        logger.info(`[FAST2SMS OTP DISPATCH SUCCESS] Sent to ${masked} | Ref: ${response.data.request_id}`);
        return {
          success: true,
          providerReference: response.data.request_id || `f2s-otp-${Date.now()}`
        };
      } else {
        const rawMsg = response.data?.message;
        const errMsg = Array.isArray(rawMsg) ? rawMsg.join(', ') : (rawMsg || 'Fast2SMS returned failure response');
        logger.warn(`[FAST2SMS OTP REJECTION] ${errMsg}`);

        if (config.NODE_ENV !== 'production') {
          return {
            success: true,
            providerReference: `simulated-fallback-${Date.now()}`,
            isSimulated: true,
            errorMessage: errMsg
          };
        }

        return {
          success: false,
          errorCode: 'PROVIDER_REJECTED',
          errorMessage: errMsg
        };
      }
    } catch (err: any) {
      const rawMsg = err.response?.data?.message;
      const errMsg = Array.isArray(rawMsg) ? rawMsg.join(', ') : (rawMsg || err.message);
      const status = err.response?.status;
      logger.error('Fast2SMS OTP dispatch error:', { status, error: errMsg });

      if (config.NODE_ENV !== 'production') {
        return {
          success: true,
          providerReference: `simulated-fallback-${Date.now()}`,
          isSimulated: true,
          errorMessage: errMsg
        };
      }

      return {
        success: false,
        errorCode: 'NETWORK_OR_AUTH_ERROR',
        errorMessage: errMsg
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
      logger.error('Twilio requested but credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER) missing.');
      return {
        success: false,
        errorCode: 'TWILIO_NOT_CONFIGURED',
        errorMessage: 'Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER) missing.'
      };
    }

    try {
      const norm = normalizePhoneNumber(recipientPhone);
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', norm.formatted);
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
          timeout: 7000
        }
      );

      const masked = maskPhone(recipientPhone);
      logger.info(`[TWILIO SMS DISPATCH SUCCESS] Sent to ${masked} | SID: ${response.data.sid}`);
      return {
        success: true,
        providerReference: response.data.sid
      };
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message;
      logger.error('Twilio dispatch error:', { error: errMsg });
      return {
        success: false,
        errorCode: 'TWILIO_ERROR',
        errorMessage: errMsg
      };
    }
  }

  async sendOtp(recipientPhone: string, otpCode: string): Promise<SmsSendResult> {
    const message = `Your AEGIS verification code is ${otpCode}. Valid for 5 minutes. Do not share this OTP with anyone.`;
    return this.sendEmergencySms(recipientPhone, message);
  }
}

export const getSmsProvider = (): SmsProvider => {
  const apiKey = config.FAST2SMS_API_KEY || config.SMS_API_KEY;
  const otpId = config.FAST2SMS_OTP_ID;

  // When explicitly configured as 'mock', always use MockSmsProvider regardless of existing keys
  if (config.SMS_PROVIDER === 'mock') {
    return new MockSmsProvider();
  }

  // If explicitly configured for twilio or fast2sms
  if (config.SMS_PROVIDER === 'twilio') {
    return new TwilioSmsProvider(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN, config.TWILIO_FROM_NUMBER);
  }
  if (config.SMS_PROVIDER === 'fast2sms') {
    return new Fast2SmsProvider(apiKey, config.SMS_SENDER_ID, otpId);
  }

  // Auto-detect real configured provider if present
  if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN && config.TWILIO_FROM_NUMBER) {
    return new TwilioSmsProvider(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN, config.TWILIO_FROM_NUMBER);
  }
  if (apiKey && apiKey.length > 5) {
    return new Fast2SmsProvider(apiKey, config.SMS_SENDER_ID, otpId);
  }
  return new MockSmsProvider();
};
