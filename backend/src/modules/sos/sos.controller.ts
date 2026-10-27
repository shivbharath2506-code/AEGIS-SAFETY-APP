import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { inMemoryStore } from '../../database/inMemoryStore';
import { getSmsProvider, normalizePhoneNumber } from '../../integrations/sms';
import { getPushProvider } from '../../integrations/notifications';
import { getVoiceProvider } from '../../integrations/voice';
import { generateSecureToken, hashToken } from '../../utils/crypto';
import { successResponse, errorResponse } from '../../utils/response';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { SOSAlert, SOSDelivery, EmergencyContact, LocationSession, LocationUpdate } from '../../types';

export const triggerSosSchema = z.object({
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  accuracyMeters: z.number().nullable().optional(),
  locationAccuracyMeters: z.number().nullable().optional(),
  triggerMethod: z.string().optional(),
  locationCapturedAt: z.string().optional()
});

export const resolveSosSchema = z.object({
  alertId: z.string().optional(),
  resolutionNote: z.string().max(300).optional(),
  resolutionNotes: z.string().max(300).optional()
});

export class SosController {
  async triggerSos(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;
    const { latitude, longitude, locationAccuracyMeters, locationCapturedAt, accuracyMeters } = req.body;
    const accuracy = locationAccuracyMeters ?? accuracyMeters ?? null;

    const hasLocation = typeof latitude === 'number' && typeof longitude === 'number';

    let liveSessionId: string | null = null;
    let liveTrackingUrl: string | null = null;

    // If location is available, initialize a real-time live location session for this SOS
    if (hasLocation) {
      const rawToken = generateSecureToken(24);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 120 * 60 * 1000); // 2 hours emergency window

      const locationSession: LocationSession = {
        id: uuidv4(),
        user_id: userId,
        token_hash: tokenHash,
        raw_token: rawToken,
        is_active: true,
        started_at: new Date(),
        expires_at: expiresAt,
        stopped_at: null
      };

      inMemoryStore.sessions.set(locationSession.id, locationSession);
      inMemoryStore.locationUpdates.set(locationSession.id, [{
        id: uuidv4(),
        location_session_id: locationSession.id,
        latitude,
        longitude,
        accuracy_meters: accuracy,
        captured_at: new Date()
      }]);

      liveSessionId = locationSession.id;
      liveTrackingUrl = `/track.html?session=${locationSession.id}&token=${rawToken}`;
    }

    const alert: SOSAlert = {
      id: uuidv4(),
      user_id: userId,
      status: 'ACTIVE',
      latitude: hasLocation ? latitude : null,
      longitude: hasLocation ? longitude : null,
      location_accuracy_meters: hasLocation ? accuracy : null,
      location_captured_at: locationCapturedAt ? new Date(locationCapturedAt) : (hasLocation ? new Date() : null),
      live_session_id: liveSessionId,
      live_tracking_url: liveTrackingUrl,
      created_at: new Date(),
      resolved_at: null
    };

    inMemoryStore.alerts.set(alert.id, alert);
    logger.info(`[SOS TRIGGERED] Alert ID: ${alert.id} by User: ${userId} (Location: ${hasLocation ? `${latitude},${longitude}` : 'UNAVAILABLE'})`);

    // Fetch user's active emergency contacts
    const contacts: EmergencyContact[] = [];
    for (const c of inMemoryStore.contacts.values()) {
      if (c.user_id === userId && c.can_receive_alerts) {
        contacts.push(c);
      }
    }

    const smsProvider = getSmsProvider();
    const pushProvider = getPushProvider();
    const deliveries: SOSDelivery[] = [];

    const senderName = req.user!.displayName || 'AEGIS Safety User';
    const timestampStr = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });

    let mapLink = 'Location not attached (GPS unavailable)';
    if (hasLocation) {
      mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    }

    const publicBase = config.LOCATION_PUBLIC_BASE_URL.replace(/\/live$/, '');
    const trackingStr = liveTrackingUrl ? ` Live Tracker: ${publicBase}${liveTrackingUrl}.` : '';
    const emergencySmsContent = `EMERGENCY ALERT: ${senderName} triggered an AEGIS Emergency Alert at ${timestampStr} IST. Location: ${mapLink}.${trackingStr} Immediate assistance requested. Verify safety. Police: 112 / 100, Women: 1091.`;

    // Process delivery for all contacts concurrently
    const smsDeliveryPromises = contacts.map(async (contact) => {
      const smsDelivery: SOSDelivery = {
        id: uuidv4(),
        sos_alert_id: alert.id,
        emergency_contact_id: contact.id,
        channel: 'SMS',
        status: 'SENDING',
        provider_reference: null,
        attempt_count: 1,
        last_attempt_at: new Date(),
        delivered_at: null,
        error_code: null,
        error_message: null,
        created_at: new Date()
      };

      try {
        const norm = normalizePhoneNumber(contact.phone_number);
        const smsResult = await smsProvider.sendEmergencySms(norm.formatted, emergencySmsContent);
        if (smsResult.success) {
          smsDelivery.status = smsResult.isSimulated ? 'SIMULATED_DISPATCH' : 'SENT_TO_PROVIDER';
          smsDelivery.provider_reference = smsResult.providerReference || null;
          smsDelivery.error_message = smsResult.errorMessage || null;
        } else if (config.NODE_ENV !== 'production') {
          // Gracefully fallback to simulated dispatch in dev mode so testing is not blocked
          logger.warn(`Live SMS provider rejected for ${norm.formatted} (${smsResult.errorMessage}). Falling back to simulated delivery.`);
          smsDelivery.status = 'SIMULATED_DISPATCH';
          smsDelivery.provider_reference = `simulated-fallback-${Date.now()}`;
          smsDelivery.error_message = smsResult.errorMessage || 'Provider unavailable';
        } else {
          smsDelivery.status = 'FAILED';
          smsDelivery.error_code = smsResult.errorCode || 'DISPATCH_ERROR';
          smsDelivery.error_message = smsResult.errorMessage || 'SMS dispatch failed';
        }
      } catch (err: any) {
        if (config.NODE_ENV !== 'production') {
          logger.warn(`SMS dispatch exception for ${contact.phone_number} (${err.message}). Falling back to simulated delivery.`);
          smsDelivery.status = 'SIMULATED_DISPATCH';
          smsDelivery.provider_reference = `simulated-fallback-${Date.now()}`;
          smsDelivery.error_message = err.message;
        } else {
          smsDelivery.status = 'FAILED';
          smsDelivery.error_code = 'EXCEPTION';
          smsDelivery.error_message = err.message;
        }
      }

      inMemoryStore.deliveries.set(smsDelivery.id, smsDelivery);
      return smsDelivery;
    });

    const resolvedSmsDeliveries = await Promise.all(smsDeliveryPromises);
    deliveries.push(...resolvedSmsDeliveries);

    // Push notification dispatch
    const pushDelivery: SOSDelivery = {
      id: uuidv4(),
      sos_alert_id: alert.id,
      emergency_contact_id: null,
      channel: 'PUSH',
      status: 'SENDING',
      provider_reference: null,
      attempt_count: 1,
      last_attempt_at: new Date(),
      delivered_at: null,
      error_code: null,
      error_message: null,
      created_at: new Date()
    };

    try {
      const pushResult = await pushProvider.sendPush(['mock-device-token'], {
        title: 'EMERGENCY ALERT DISPATCHED',
        body: `Emergency alert active for ${senderName}.`
      });
      if (pushResult.success) {
        pushDelivery.status = pushResult.isSimulated ? 'SIMULATED_DISPATCH' : 'SENT_TO_PROVIDER';
        pushDelivery.provider_reference = pushResult.providerReference || null;
      } else {
        pushDelivery.status = 'FAILED';
        pushDelivery.error_code = pushResult.errorCode || 'FCM_ERROR';
        pushDelivery.error_message = pushResult.errorMessage || 'FCM push dispatch failed';
      }
    } catch (err: any) {
      pushDelivery.status = 'FAILED';
      pushDelivery.error_message = err.message;
    }
    inMemoryStore.deliveries.set(pushDelivery.id, pushDelivery);
    deliveries.push(pushDelivery);

    const sentCount = deliveries.filter(d => d.status === 'SENT_TO_PROVIDER').length;
    const simCount = deliveries.filter(d => d.status === 'SIMULATED_DISPATCH').length;
    const failCount = deliveries.filter(d => d.status === 'FAILED').length;

    let dispatchMessage = '';
    if (contacts.length === 0) {
      dispatchMessage = 'Emergency alert created. Note: No emergency contacts are currently configured.';
    } else if (sentCount > 0) {
      dispatchMessage = `Emergency alert dispatched via real SMS to ${sentCount} contact(s).`;
    } else if (simCount > 0) {
      dispatchMessage = `Emergency alert recorded. SMS simulated in development mode (${simCount} contacts).`;
    } else {
      dispatchMessage = `Emergency alert recorded. Notice: SMS dispatch failed (${failCount} errors). Check provider credentials.`;
    }

    // Map recipient details for each delivery
    const contactMap = new Map(contacts.map(c => [c.id, c]));

    return successResponse(
      res,
      {
        alert: {
          id: alert.id,
          status: alert.status,
          latitude: alert.latitude,
          longitude: alert.longitude,
          locationAccuracyMeters: alert.location_accuracy_meters,
          createdAt: alert.created_at,
          timestamp: alert.created_at,
          locationAvailable: hasLocation,
          googleMapsUrl: mapLink,
          liveSessionId,
          liveTrackingUrl
        },
        contactCount: contacts.length,
        deliveries: deliveries.map((d) => {
          const contact = d.emergency_contact_id ? contactMap.get(d.emergency_contact_id) : null;
          return {
            id: d.id,
            channel: d.channel,
            status: d.status,
            contactId: d.emergency_contact_id,
            recipientName: contact ? contact.display_name : (d.channel === 'PUSH' ? 'Device Push' : 'Contact'),
            recipientPhone: contact ? contact.phone_number : null,
            isSimulated: d.status === 'SIMULATED_DISPATCH',
            providerRef: d.provider_reference,
            errorCode: d.error_code,
            errorMessage: d.error_message
          };
        }),
        dispatches: deliveries.map((d) => {
          const contact = d.emergency_contact_id ? contactMap.get(d.emergency_contact_id) : null;
          return {
            contactId: d.emergency_contact_id,
            recipientName: contact ? contact.display_name : (d.channel === 'PUSH' ? 'Device Push' : 'Contact'),
            recipientPhone: contact ? contact.phone_number : null,
            channel: d.channel,
            status: d.status,
            isSimulated: d.status === 'SIMULATED_DISPATCH',
            messageId: d.provider_reference,
            providerError: d.error_message
          };
        }),
        deliverySummary: {
          totalContacts: contacts.length,
          sentToProvider: sentCount,
          simulated: simCount,
          failed: failCount
        }
      },
      dispatchMessage,
      201
    );
  }

  async triggerCallToContact(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;
    const { contactId, phone } = req.body;
    const senderName = req.user!.displayName || 'AEGIS Safety User';

    let targetPhone = phone;
    let targetName = 'Primary Contact';

    if (contactId) {
      const contact = inMemoryStore.contacts.get(contactId);
      if (contact && contact.user_id === userId) {
        targetPhone = contact.phone_number;
        targetName = contact.display_name;
      }
    }

    if (!targetPhone) {
      for (const c of inMemoryStore.contacts.values()) {
        if (c.user_id === userId && c.is_primary) {
          targetPhone = c.phone_number;
          targetName = c.display_name;
          break;
        }
      }
    }

    if (!targetPhone) {
      return errorResponse(res, 'NO_CONTACT', 'No emergency contact phone number available for outbound call.', 400);
    }

    const norm = normalizePhoneNumber(targetPhone);
    const voiceProvider = getVoiceProvider();
    const result = await voiceProvider.initiateEmergencyCall(norm.formatted, senderName, 'Chennai Metropolitan Area');

    if (result.success) {
      return successResponse(res, {
        calledNumber: norm.formatted,
        contactPhone: norm.formatted,
        contactName: targetName,
        status: result.isSimulated ? 'SIMULATED_CALL_DISPATCHED' : 'CALL_INITIATED',
        callSid: result.callSid,
        isSimulated: !!result.isSimulated,
        providerStatus: result.isSimulated ? 'SIMULATED' : 'LIVE_CALL_INITIATED'
      }, result.isSimulated ? 'Simulated call triggered (Development Mode).' : 'Emergency voice call initiated successfully.');
    } else {
      return errorResponse(res, result.errorCode || 'CALL_FAILED', result.errorMessage || 'Failed to place outbound emergency call.', 502);
    }
  }

  async getAlertHistory(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;
    const userAlerts: SOSAlert[] = [];

    for (const a of inMemoryStore.alerts.values()) {
      if (a.user_id === userId) {
        userAlerts.push(a);
      }
    }

    userAlerts.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    const enriched = userAlerts.map((a) => {
      let deliveryCount = 0;
      let sentCount = 0;
      for (const d of inMemoryStore.deliveries.values()) {
        if (d.sos_alert_id === a.id) {
          deliveryCount++;
          if (d.status === 'SENT_TO_PROVIDER' || d.status === 'DELIVERED') {
            sentCount++;
          }
        }
      }
      return {
        id: a.id,
        status: a.status,
        latitude: a.latitude,
        longitude: a.longitude,
        hasLocation: a.latitude !== null && a.longitude !== null,
        createdAt: a.created_at,
        resolvedAt: a.resolved_at,
        resolutionNote: a.resolution_note,
        totalDeliveries: deliveryCount,
        sentDeliveries: sentCount
      };
    });

    return successResponse(res, enriched);
  }

  async getAlertById(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const alert = inMemoryStore.alerts.get(id);

    if (!alert) {
      return errorResponse(res, 'NOT_FOUND', 'Emergency alert not found.', 404);
    }

    // User isolation check
    if (alert.user_id !== userId) {
      return errorResponse(res, 'FORBIDDEN', 'Access denied to this alert.', 403);
    }

    const deliveries: SOSDelivery[] = [];
    for (const d of inMemoryStore.deliveries.values()) {
      if (d.sos_alert_id === alert.id) {
        deliveries.push(d);
      }
    }

    return successResponse(res, {
      alert,
      deliveries
    });
  }

  async resolveAlert(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;
    const id = (req.params.id || req.body.alertId) as string;

    if (!id) {
      return errorResponse(res, 'BAD_REQUEST', 'Emergency alert ID is required.', 400);
    }

    const alert = inMemoryStore.alerts.get(id);

    if (!alert) {
      return errorResponse(res, 'NOT_FOUND', 'Emergency alert not found.', 404);
    }

    if (alert.user_id !== userId) {
      return errorResponse(res, 'FORBIDDEN', 'Access denied to this alert.', 403);
    }

    const { resolutionNote, resolutionNotes } = req.body;
    alert.status = 'RESOLVED';
    alert.resolved_at = new Date();
    alert.resolution_note = resolutionNote || resolutionNotes || 'User indicated safety has been restored.';

    logger.info(`[SOS RESOLVED] Alert ${id} marked as resolved.`);

    return successResponse(
      res,
      {
        id: alert.id,
        status: alert.status,
        resolved: true,
        resolvedAt: alert.resolved_at,
        resolutionNote: alert.resolution_note
      },
      'Emergency alert marked as resolved. Contacts can be notified of resolution.'
    );
  }

  async getAlertDeliveries(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const alert = inMemoryStore.alerts.get(id);

    if (!alert) {
      return errorResponse(res, 'NOT_FOUND', 'Emergency alert not found.', 404);
    }

    if (alert.user_id !== userId) {
      return errorResponse(res, 'FORBIDDEN', 'Access denied.', 403);
    }

    const deliveries: SOSDelivery[] = [];
    for (const d of inMemoryStore.deliveries.values()) {
      if (d.sos_alert_id === alert.id) {
        deliveries.push(d);
      }
    }

    return successResponse(res, deliveries);
  }
}

export const sosController = new SosController();
