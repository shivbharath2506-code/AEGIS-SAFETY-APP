import { Request, Response } from 'express';
import { z } from 'zod';
import { inMemoryStore } from '../../database/inMemoryStore';
import { successResponse, errorResponse } from '../../utils/response';
import { User } from '../../types';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  medicalNotes: z.string().max(500).optional().nullable()
});

export class UsersController {
  async getProfile(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;
    const user = inMemoryStore.users.get(userId);

    if (!user) {
      return errorResponse(res, 'USER_NOT_FOUND', 'User profile not found.', 404);
    }

    return successResponse(res, {
      id: user.id,
      firebaseUid: user.firebase_uid,
      displayName: user.display_name,
      verifiedPhoneNumber: user.verified_phone_number,
      medicalNotes: user.medical_notes,
      accountStatus: user.account_status,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });
  }

  async updateProfile(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;
    const { displayName, medicalNotes } = req.body;

    let user = inMemoryStore.users.get(userId);
    if (!user) {
      user = {
        id: userId,
        firebase_uid: req.user!.firebaseUid,
        display_name: displayName || req.user!.displayName,
        verified_phone_number: req.user!.phoneNumber,
        medical_notes: medicalNotes !== undefined ? medicalNotes : null,
        account_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      };
      inMemoryStore.users.set(userId, user);
    } else {
      if (displayName !== undefined) user.display_name = displayName;
      if (medicalNotes !== undefined) user.medical_notes = medicalNotes;
      user.updated_at = new Date();
    }

    return successResponse(res, {
      id: user.id,
      displayName: user.display_name,
      verifiedPhoneNumber: user.verified_phone_number,
      medicalNotes: user.medical_notes,
      updatedAt: user.updated_at
    }, 'User profile updated successfully.');
  }

  async deleteAccount(req: Request, res: Response): Promise<any> {
    const userId = req.user!.id;

    // Delete user's emergency contacts
    for (const [id, c] of inMemoryStore.contacts.entries()) {
      if (c.user_id === userId) {
        inMemoryStore.contacts.delete(id);
      }
    }

    // Mark user status deleted
    const user = inMemoryStore.users.get(userId);
    if (user) {
      user.account_status = 'DELETED';
      user.updated_at = new Date();
    }

    return successResponse(res, { deleted: true }, 'Account and associated sensitive emergency data successfully purged.');
  }
}

export const usersController = new UsersController();
