import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export interface VoiceCallResult {
  success: boolean;
  callSid?: string;
  providerReference?: string;
  errorCode?: string;
  errorMessage?: string;
  isSimulated?: boolean;
}

export interface VoiceProvider {
  initiateEmergencyCall(recipientPhone: string, senderName: string, locationSummary?: string): Promise<VoiceCallResult>;
}

export class MockVoiceProvider implements VoiceProvider {
  async initiateEmergencyCall(recipientPhone: string, senderName: string, locationSummary?: string): Promise<VoiceCallResult> {
    if (config.NODE_ENV === 'production') {
      return {
        success: false,
        errorCode: 'MOCK_DISALLOWED_IN_PROD',
        errorMessage: 'Mock voice provider is disallowed in production. Configure TWILIO_ACCOUNT_SID and TWILIO_FROM_NUMBER.'
      };
    }
    const reference = `mock-call-${Date.now()}`;
    logger.info(`[DEV SIMULATED VOICE CALL] Recipient: ${recipientPhone} | Caller: ${senderName} | Ref: ${reference}`);
    return {
      success: true,
      callSid: reference,
      providerReference: reference,
      isSimulated: true
    };
  }
}

export class TwilioVoiceProvider implements VoiceProvider {
  private accountSid?: string;
  private authToken?: string;
  private fromNumber?: string;

  constructor(accountSid?: string, authToken?: string, fromNumber?: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
  }

  async initiateEmergencyCall(recipientPhone: string, senderName: string, locationSummary?: string): Promise<VoiceCallResult> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      logger.warn('[TWILIO VOICE] Credentials not fully configured in environment.');
      return {
        success: false,
        errorCode: 'TWILIO_VOICE_NOT_CONFIGURED',
        errorMessage: 'Twilio voice credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER) missing.'
      };
    }

    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const twimlMessage = `
        <Response>
          <Pause length="1"/>
          <Say voice="alice" language="en-IN">
            Emergency alert from AEGIS Safety System. Your contact, ${senderName}, has triggered an emergency alert in Chennai.
            ${locationSummary ? `Location: ${locationSummary}.` : ''}
            Please check your messages for the live location tracking link, or contact emergency services immediately.
          </Say>
          <Pause length="2"/>
          <Say voice="alice" language="en-IN">Repeating: Emergency alert for ${senderName}. Please take action now.</Say>
        </Response>
      `.trim();

      const params = new URLSearchParams();
      params.append('To', recipientPhone);
      params.append('From', this.fromNumber);
      params.append('Twiml', twimlMessage);

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls.json`,
        params.toString(),
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 8000
        }
      );

      logger.info(`[TWILIO VOICE DISPATCH] Outbound call placed to ${recipientPhone} | Call SID: ${response.data.sid}`);
      return {
        success: true,
        callSid: response.data.sid,
        providerReference: response.data.sid
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message;
      logger.error('Twilio voice dispatch error:', { error: errorMsg });
      return {
        success: false,
        errorCode: 'TWILIO_CALL_FAILED',
        errorMessage: errorMsg
      };
    }
  }
}

export const getVoiceProvider = (): VoiceProvider => {
  if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN && config.TWILIO_FROM_NUMBER) {
    return new TwilioVoiceProvider(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN, config.TWILIO_FROM_NUMBER);
  }
  return new MockVoiceProvider();
};
