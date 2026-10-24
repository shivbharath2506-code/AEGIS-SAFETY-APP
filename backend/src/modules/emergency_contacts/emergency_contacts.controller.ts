import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { inMemoryStore } from '../../database/inMemoryStore';
import { successResponse, errorResponse } from '../../utils/response';
import { EmergencyContact, ContactRelationship } from '../../types';

export const createContactSchema = z.object({
  displayName: z.string().min(1, 'Contact name is required').max(100),
  phoneNumber: z.string().min(10, 'Valid phone number required').max(20),
  relationship: z.enum(['FAMILY', 'FRIEND', 'GUARDIAN', 'TRUSTED', 'OTHER']).default('TRUSTED'),
  isPrimary: z.boolean().default(false),
  canReceiveAlerts: z.boolean().default(true)
});

export const updateContactSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().min(10).max(20).optional(),
  relationship: z.enum(['FAMILY', 'FRIEND', 'GUARDIAN', 'TRUSTED', 'OTHER']).optional(),
  isPrimary: z.boolean().optional(),
  canReceiveAlerts: z.boolean().optional()
});

export class EmergencyContactsController {
  async listContacts(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;
    const userContacts: EmergencyContact[] = [];

    for (const contact of inMemoryStore.contacts.values()) {
      if (contact.user_id === userId) {
        userContacts.push(contact);
      }
    }

    // Sort by primary contact first, then by name
    userContacts.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));

    return successResponse(res, userContacts);
  }

  async addContact(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;
    const { displayName, phoneNumber, relationship, isPrimary, canReceiveAlerts } = req.body;

    // Check for duplicate phone number for this user
    for (const c of inMemoryStore.contacts.values()) {
      if (c.user_id === userId && c.phone_number === phoneNumber) {
        return errorResponse(res, 'DUPLICATE_CONTACT', 'A contact with this phone number already exists.', 409);
      }
    }

    // If new contact is primary, reset any other primary contacts for this user
    if (isPrimary) {
      for (const c of inMemoryStore.contacts.values()) {
        if (c.user_id === userId && c.is_primary) {
          c.is_primary = false;
        }
      }
    }

    const newContact: EmergencyContact = {
      id: uuidv4(),
      user_id: userId,
      display_name: displayName,
      phone_number: phoneNumber,
      relationship: relationship as ContactRelationship,
      is_primary: isPrimary || false,
      can_receive_alerts: canReceiveAlerts !== undefined ? canReceiveAlerts : true,
      created_at: new Date(),
      updated_at: new Date()
    };

    inMemoryStore.contacts.set(newContact.id, newContact);

    return successResponse(res, newContact, 'Emergency contact added successfully.', 201);
  }

  async updateContact(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const contact = inMemoryStore.contacts.get(id);

    if (!contact) {
      return errorResponse(res, 'NOT_FOUND', 'Emergency contact not found.', 404);
    }

    // Strict User Isolation Check
    if (contact.user_id !== userId) {
      return errorResponse(res, 'FORBIDDEN', 'You are not authorized to modify this contact.', 403);
    }

    const { displayName, phoneNumber, relationship, isPrimary, canReceiveAlerts } = req.body;

    if (isPrimary) {
      for (const c of inMemoryStore.contacts.values()) {
        if (c.user_id === userId && c.id !== id && c.is_primary) {
          c.is_primary = false;
        }
      }
    }

    if (displayName !== undefined) contact.display_name = displayName;
    if (phoneNumber !== undefined) contact.phone_number = phoneNumber;
    if (relationship !== undefined) contact.relationship = relationship;
    if (isPrimary !== undefined) contact.is_primary = isPrimary;
    if (canReceiveAlerts !== undefined) contact.can_receive_alerts = canReceiveAlerts;
    contact.updated_at = new Date();

    return successResponse(res, contact, 'Emergency contact updated successfully.');
  }

  async deleteContact(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const contact = inMemoryStore.contacts.get(id);

    if (!contact) {
      return errorResponse(res, 'NOT_FOUND', 'Emergency contact not found.', 404);
    }

    // Strict User Isolation Check
    if (contact.user_id !== userId) {
      return errorResponse(res, 'FORBIDDEN', 'You are not authorized to delete this contact.', 403);
    }

    inMemoryStore.contacts.delete(id);
    return successResponse(res, { deleted: true }, 'Emergency contact deleted successfully.');
  }
}

export const emergencyContactsController = new EmergencyContactsController();
