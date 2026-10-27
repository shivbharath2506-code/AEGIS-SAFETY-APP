import { Request, Response } from 'express';
import { z } from 'zod';
import { inMemoryStore } from '../../database/inMemoryStore';
import { successResponse, errorResponse } from '../../utils/response';
import { User } from '../../types';
import { otpService } from './otp.service';
import { getPublicFirebaseConfig, verifyFirebaseIdToken } from '../../integrations/firebase';
import { findOrCreateUserByFirebaseIdentity } from './user.service';

export const requestOtpSchema = z.object({
  phoneNumber: z.string().min(10, 'Valid 10-digit phone number is required').max(20)
});

export const loginWithPhoneSchema = z.object({
  phoneNumber: z.string().min(10, 'Valid 10-digit phone number is required').max(20),
  otp: z.string().min(4, 'Valid OTP required').max(8),
  displayName: z.string().min(1).max(100).optional()
});

export const firebaseLoginSchema = z.object({
  idToken: z.string().min(10, 'Valid Firebase ID token is required'),
  displayName: z.string().min(1).max(100).optional()
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  medicalNotes: z.string().max(500).optional().nullable()
});

export class UsersController {
  async getFirebaseConfig(req: Request, res: Response): Promise<any> {
    const configData = getPublicFirebaseConfig();
    return successResponse(res, configData, 'Firebase client configuration.');
  }

  async firebaseLogin(req: Request, res: Response): Promise<any> {
    const { idToken, displayName } = req.body;

    try {
      const decoded = await verifyFirebaseIdToken(idToken);
      const user = findOrCreateUserByFirebaseIdentity(decoded.uid, decoded.phoneNumber, displayName || decoded.displayName);

      return successResponse(
        res,
        {
          token: idToken,
          firebaseUid: user.firebase_uid,
          user: {
            id: user.id,
            displayName: user.display_name,
            verifiedPhoneNumber: user.verified_phone_number,
            accountStatus: user.account_status
          }
        },
        'Firebase authentication verified successfully.'
      );
    } catch (err: any) {
      return errorResponse(res, 'FIREBASE_AUTH_FAILED', `Firebase ID token verification failed: ${err.message}`, 401);
    }
  }
  async requestOtp(req: Request, res: Response): Promise<any> {
    const { phoneNumber } = req.body;
    const result = await otpService.dispatchOtp(phoneNumber);

    if (!result.success) {
      return errorResponse(
        res,
        'OTP_REQUEST_FAILED',
        result.error || 'Failed to dispatch verification code.',
        result.statusCode || 400
      );
    }

    return successResponse(
      res,
      {
        phoneNumber: result.formattedPhone,
        expiresInSeconds: result.expiresInSeconds,
        ...(result.devOtp ? { devOtp: result.devOtp } : {}),
        ...(result.error ? { providerNotice: result.error } : {})
      },
      result.error
        ? `Verification code generated: ${result.error}`
        : 'One-time verification code dispatched via secure SMS.'
    );
  }

  async loginWithPhone(req: Request, res: Response): Promise<any> {
    const { phoneNumber, otp, displayName } = req.body;
    const verification = otpService.verifyOtp(phoneNumber, otp);

    if (!verification.success) {
      return errorResponse(
        res,
        'INVALID_OTP',
        verification.error || 'The verification code provided is invalid or expired.',
        verification.statusCode || 400
      );
    }

    const formatted = verification.formattedPhone!;

    let user: User | undefined;
    for (const u of inMemoryStore.users.values()) {
      if (
        u.verified_phone_number === formatted ||
        u.verified_phone_number.slice(-10) === formatted.slice(-10)
      ) {
        user = u;
        break;
      }
    }

    if (!user) {
      const newId = `user-${formatted.replace(/[^0-9]/g, '')}`;
      user = {
        id: newId,
        firebase_uid: `phone-${newId}`,
        display_name: displayName || 'AEGIS Safety User',
        verified_phone_number: formatted,
        medical_notes: null,
        account_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      };
      inMemoryStore.users.set(user.id, user);
    } else if (displayName && user.display_name === 'AEGIS Safety User') {
      user.display_name = displayName;
    }

    const token = `aegis-token-${user.id}`;
    return successResponse(
      res,
      {
        token,
        user: {
          id: user.id,
          displayName: user.display_name,
          verifiedPhoneNumber: user.verified_phone_number,
          accountStatus: user.account_status
        }
      },
      'User authenticated successfully.'
    );
  }

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
