import { inMemoryStore } from '../../database/inMemoryStore';
import { User } from '../../types';
import { normalizePhoneNumber } from '../../integrations/sms';

export function findOrCreateUserByFirebaseIdentity(
  firebaseUid: string,
  rawPhoneNumber?: string | null,
  displayName?: string | null
): User {
  let formattedPhone = '';
  if (rawPhoneNumber) {
    const norm = normalizePhoneNumber(rawPhoneNumber);
    formattedPhone = norm.formatted;
  }

  // 1. Try finding by firebase_uid first
  for (const u of inMemoryStore.users.values()) {
    if (u.firebase_uid === firebaseUid) {
      if (displayName && (!u.display_name || u.display_name === 'Citizen' || u.display_name === 'AEGIS Safety User')) {
        u.display_name = displayName;
        u.updated_at = new Date();
      }
      return u;
    }
  }

  // 2. Try finding by verified_phone_number (Safe account migration / linking)
  if (formattedPhone) {
    for (const u of inMemoryStore.users.values()) {
      if (
        u.verified_phone_number === formattedPhone ||
        (formattedPhone.length >= 10 && u.verified_phone_number.slice(-10) === formattedPhone.slice(-10))
      ) {
        // Link existing user to this Firebase UID
        u.firebase_uid = firebaseUid;
        if (displayName && (!u.display_name || u.display_name === 'Citizen' || u.display_name === 'AEGIS Safety User')) {
          u.display_name = displayName;
        }
        u.updated_at = new Date();
        return u;
      }
    }
  }

  // 3. Create new user record
  const newId = formattedPhone
    ? `user-${formattedPhone.replace(/[^0-9]/g, '')}`
    : `user-${firebaseUid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`;

  const newUser: User = {
    id: newId,
    firebase_uid: firebaseUid,
    display_name: displayName || 'Citizen',
    verified_phone_number: formattedPhone,
    medical_notes: null,
    account_status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date()
  };

  inMemoryStore.users.set(newUser.id, newUser);
  return newUser;
}
