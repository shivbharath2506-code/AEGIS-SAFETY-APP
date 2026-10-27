import crypto from 'crypto';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { getSmsProvider, normalizePhoneNumber, maskPhone } from '../../integrations/sms';

export interface StoredOtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  requestCountInWindow: number;
  windowStartTime: number;
}

export interface SendOtpResult {
  success: boolean;
  formattedPhone?: string;
  expiresInSeconds?: number;
  devOtp?: string;
  error?: string;
  statusCode?: number;
}

export interface VerifyOtpResult {
  success: boolean;
  formattedPhone?: string;
  error?: string;
  statusCode?: number;
}

export class OtpService {
  // In-memory OTP registry keyed by standardized E.164 phone number
  private activeOtps: Map<string, StoredOtpRecord> = new Map();

  // 5 minutes OTP expiration
  private readonly OTP_TTL_MS = 5 * 60 * 1000;
  // 30 seconds minimum cooldown between consecutive OTP requests for the same number
  private readonly RESEND_COOLDOWN_MS = 30 * 1000;
  // Maximum 5 OTP requests within a 15-minute sliding window
  private readonly RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
  private readonly MAX_REQUESTS_PER_WINDOW = 5;
  // Maximum 5 failed verification attempts per OTP before locking out
  private readonly MAX_FAILED_ATTEMPTS = 5;

  /**
   * Dispatches a real-time 6-digit OTP code to the requested phone number
   */
  async dispatchOtp(rawPhoneNumber: string): Promise<SendOtpResult> {
    const norm = normalizePhoneNumber(rawPhoneNumber);
    if (!norm.isValid) {
      return {
        success: false,
        error: 'Please enter a valid 10-digit mobile number.',
        statusCode: 400
      };
    }

    const phoneKey = norm.formatted;
    const now = Date.now();
    const existing = this.activeOtps.get(phoneKey);

    // 1. Rate Limit Checks
    if (existing) {
      // Cooldown check
      const elapsedSinceLast = now - existing.lastSentAt;
      if (elapsedSinceLast < this.RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((this.RESEND_COOLDOWN_MS - elapsedSinceLast) / 1000);
        return {
          success: false,
          error: `Please wait ${waitSec}s before requesting another verification code.`,
          statusCode: 429
        };
      }

      // Window rate limit check
      if (now - existing.windowStartTime < this.RATE_LIMIT_WINDOW_MS) {
        if (existing.requestCountInWindow >= this.MAX_REQUESTS_PER_WINDOW) {
          return {
            success: false,
            error: 'Too many OTP requests. Please wait a few minutes before trying again.',
            statusCode: 429
          };
        }
        existing.requestCountInWindow++;
      } else {
        existing.windowStartTime = now;
        existing.requestCountInWindow = 1;
      }
    }

    // 2. Generate cryptographically strong 6-digit numeric code
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = now + this.OTP_TTL_MS;

    const record: StoredOtpRecord = {
      code: otpCode,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
      requestCountInWindow: existing ? existing.requestCountInWindow : 1,
      windowStartTime: existing ? existing.windowStartTime : now
    };

    this.activeOtps.set(phoneKey, record);

    // 3. Dispatch via configured SMS Provider (Fast2SMS, Twilio, or Mock in dev)
    const smsProvider = getSmsProvider();
    const smsResult = await smsProvider.sendOtp(phoneKey, otpCode);

    logger.info(
      `[REAL-TIME OTP DISPATCHED] Phone: ${maskPhone(phoneKey)} | Status: ${smsResult.success ? 'SENT' : 'FAILED'} | Ref: ${
        smsResult.providerReference || 'NONE'
      } | Simulated: ${!!smsResult.isSimulated}`
    );

    if (!smsResult.success && !smsResult.isSimulated) {
      logger.warn(`SMS provider returned warning for ${maskPhone(phoneKey)}:`, { error: smsResult.errorMessage });
      if (config.NODE_ENV === 'production') {
        return {
          success: false,
          error: smsResult.errorMessage || 'Failed to dispatch SMS verification code.',
          statusCode: 502
        };
      }
      // In development, preserve active OTP record and inform user of provider KYC status
      return {
        success: true,
        formattedPhone: phoneKey,
        expiresInSeconds: Math.floor(this.OTP_TTL_MS / 1000),
        devOtp: otpCode,
        error: `SMS Gateway Notice: ${smsResult.errorMessage}`
      };
    }

    return {
      success: true,
      formattedPhone: phoneKey,
      expiresInSeconds: Math.floor(this.OTP_TTL_MS / 1000),
      devOtp: (config.NODE_ENV !== 'production' || smsResult.isSimulated) ? otpCode : undefined
    };
  }

  /**
   * Verifies an OTP code for a given phone number
   */
  verifyOtp(rawPhoneNumber: string, code: string): VerifyOtpResult {
    const norm = normalizePhoneNumber(rawPhoneNumber);
    if (!norm.isValid) {
      return {
        success: false,
        error: 'Please provide a valid phone number.',
        statusCode: 400
      };
    }

    const phoneKey = norm.formatted;
    const record = this.activeOtps.get(phoneKey);
    const now = Date.now();

    if (!record) {
      return {
        success: false,
        formattedPhone: phoneKey,
        error: 'No active verification code found for this number. Please request a new OTP.',
        statusCode: 400
      };
    }

    // Check expiry
    if (now > record.expiresAt) {
      this.activeOtps.delete(phoneKey);
      return {
        success: false,
        formattedPhone: phoneKey,
        error: 'Verification code has expired. Please request a new code.',
        statusCode: 400
      };
    }

    // Check failed attempts limit
    record.attempts++;
    if (record.attempts > this.MAX_FAILED_ATTEMPTS) {
      this.activeOtps.delete(phoneKey);
      return {
        success: false,
        formattedPhone: phoneKey,
        error: 'Too many failed verification attempts. Please request a new code.',
        statusCode: 429
      };
    }

    // Compare code securely
    const cleanCode = code.trim();
    if (record.code !== cleanCode) {
      const remaining = this.MAX_FAILED_ATTEMPTS - record.attempts;
      return {
        success: false,
        formattedPhone: phoneKey,
        error: `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code revoked.'}`,
        statusCode: 400
      };
    }

    // Verification successful: consume single-use OTP
    this.activeOtps.delete(phoneKey);
    logger.info(`[REAL-TIME OTP VERIFIED] Successfully authenticated phone: ${maskPhone(phoneKey)}`);

    return {
      success: true,
      formattedPhone: phoneKey
    };
  }

  /**
   * Clear all active OTP records (useful for test resets)
   */
  clear(): void {
    this.activeOtps.clear();
  }
}

export const otpService = new OtpService();
