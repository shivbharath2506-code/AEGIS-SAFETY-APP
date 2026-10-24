import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { inMemoryStore } from '../../database/inMemoryStore';
import { getSmsProvider } from '../../integrations/sms';
import { getPushProvider } from '../../integrations/notifications';
import { successResponse, errorResponse } from '../../utils/response';
import { logger } from '../../utils/logger';
import { SOSAlert, SOSDelivery, EmergencyContact } from '../../types';

export const triggerSosSchema = z.object({
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  locationAccuracyMeters: z.number().nullable().optional(),
  locationCapturedAt: z.string().optional()
});

export const resolveSosSchema = z.object({
  resolutionNote: z.string().max(300).optional()
});

export class SosController {
  async triggerSos(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;
    const { latitude, longitude, locationAccuracyMeters, locationCapturedAt } = req.body;

    const hasLocation = typeof latitude === 'number' && typeof longitude === 'number';

    const alert: SOSAlert = {
      id: uuidv4(),
      user_id: userId,
      status: 'ACTIVE',
      latitude: hasLocation ? latitude : null,
      longitude: hasLocation ? longitude : null,
      location_accuracy_meters: hasLocation ? locationAccuracyMeters ?? null : null,
      location_captured_at: locationCapturedAt ? new Date(locationCapturedAt) : (hasLocation ? new Date() : null),
      created_at: new Date(),
      resolved_at: null
    };

    inMemoryStore.alerts.set(alert.id, alert);
    logger.info(`[SOS TRIGGERED] Alert ID: ${alert.id} by User: ${userId} (Location attached: ${hasLocation})`);

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

    const emergencySmsContent = `EMERGENCY ALERT: ${senderName} triggered an AEGIS Emergency Alert at ${timestampStr} IST. Location: ${mapLink}. Immediate assistance requested. Verify safety. Police: 112 / 100, Women: 1091.`;

    // Process delivery for each contact
    for (const contact of contacts) {
      // 1. Create delivery record
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
        const smsResult = await smsProvider.sendEmergencySms(contact.phone_number, emergencySmsContent);
        if (smsResult.success) {
          smsDelivery.status = 'SENT_TO_PROVIDER';
          smsDelivery.provider_reference = smsResult.providerReference || null;
        } else {
          smsDelivery.status = 'FAILED';
          smsDelivery.error_code = smsResult.errorCode || 'DISPATCH_ERROR';
          smsDelivery.error_message = smsResult.errorMessage || 'SMS dispatch failed';
        }
      } catch (err: any) {
        smsDelivery.status = 'FAILED';
        smsDelivery.error_code = 'EXCEPTION';
        smsDelivery.error_message = err.message;
      }

      inMemoryStore.deliveries.set(smsDelivery.id, smsDelivery);
      deliveries.push(smsDelivery);
    }

    // Attempt Push notification dispatch if device tokens exist
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
      pushDelivery.status = pushResult.success ? 'SENT_TO_PROVIDER' : 'FAILED';
      pushDelivery.provider_reference = pushResult.providerReference || null;
    } catch (err: any) {
      pushDelivery.status = 'FAILED';
      pushDelivery.error_message = err.message;
    }
    inMemoryStore.deliveries.set(pushDelivery.id, pushDelivery);
    deliveries.push(pushDelivery);

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
          locationAvailable: hasLocation
        },
        contactCount: contacts.length,
        deliveries: deliveries.map((d) => ({
          id: d.id,
          channel: d.channel,
          status: d.status,
          contactId: d.emergency_contact_id,
          providerRef: d.provider_reference,
          errorCode: d.error_code
        }))
      },
      contacts.length > 0
        ? `Emergency alert created and dispatched to ${contacts.length} trusted contact(s).`
        : 'Emergency alert created. Note: No emergency contacts are currently configured.',
      201
    );
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
    const id = req.params.id as string;
    const alert = inMemoryStore.alerts.get(id);

    if (!alert) {
      return errorResponse(res, 'NOT_FOUND', 'Emergency alert not found.', 404);
    }

    if (alert.user_id !== userId) {
      return errorResponse(res, 'FORBIDDEN', 'Access denied to this alert.', 403);
    }

    const { resolutionNote } = req.body;
    alert.status = 'RESOLVED';
    alert.resolved_at = new Date();
    alert.resolution_note = resolutionNote || 'User indicated safety has been restored.';

    logger.info(`[SOS RESOLVED] Alert ${id} marked as resolved.`);

    return successResponse(
      res,
      {
        id: alert.id,
        status: alert.status,
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
