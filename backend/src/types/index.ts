export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface User {
  id: string;
  firebase_uid: string;
  display_name: string | null;
  verified_phone_number: string;
  medical_notes: string | null;
  account_status: AccountStatus;
  created_at: Date;
  updated_at: Date;
}

export type ContactRelationship = 'FAMILY' | 'FRIEND' | 'GUARDIAN' | 'TRUSTED' | 'OTHER';

export interface EmergencyContact {
  id: string;
  user_id: string;
  display_name: string;
  phone_number: string;
  relationship: ContactRelationship;
  is_primary: boolean;
  can_receive_alerts: boolean;
  created_at: Date;
  updated_at: Date;
}

export type SOSStatus = 'ACTIVE' | 'RESOLVED' | 'CANCELLED';

export interface SOSAlert {
  id: string;
  user_id: string;
  status: SOSStatus;
  latitude: number | null;
  longitude: number | null;
  location_accuracy_meters: number | null;
  location_captured_at: Date | null;
  live_session_id?: string | null;
  live_tracking_url?: string | null;
  resolution_note?: string | null;
  created_at: Date;
  resolved_at: Date | null;
}

export type DeliveryChannel = 'SMS' | 'PUSH' | 'CALL_NOTICE' | 'VOICE_CALL';

export type DeliveryStatus =
  | 'CREATED'
  | 'QUEUED'
  | 'SENDING'
  | 'SENT_TO_PROVIDER'
  | 'SIMULATED_DISPATCH'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export interface SOSDelivery {
  id: string;
  sos_alert_id: string;
  emergency_contact_id: string | null;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  provider_reference: string | null;
  attempt_count: number;
  last_attempt_at: Date | null;
  delivered_at: Date | null;
  error_code: string | null;
  error_message: string | null;
  created_at: Date;
}

export interface LocationSession {
  id: string;
  user_id: string;
  token_hash: string;
  raw_token: string;
  is_active: boolean;
  started_at: Date;
  expires_at: Date;
  stopped_at: Date | null;
}

export interface LocationUpdate {
  id: string;
  location_session_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  captured_at: Date;
}

export type SafetyCategory = 'LIGHTING' | 'CROWD' | 'ISOLATED_AREA' | 'FACILITY_CLUSTER';
export type SafetyConfidence = 'AUTHORITATIVE' | 'LICENSED_OPEN' | 'COMMUNITY_VERIFIED' | 'UNVERIFIED';

export interface SafetyDataPoint {
  id: string;
  source: string;
  category: SafetyCategory;
  latitude: number;
  longitude: number;
  confidence: SafetyConfidence;
  safety_score: number;
  metadata: Record<string, any>;
  observed_at: Date | null;
  imported_at: Date;
}

export type FacilityCategory = 'POLICE' | 'HOSPITAL' | 'PHARMACY';

export interface NearbyFacility {
  id: string;
  provider: string;
  external_place_id: string | null;
  category: FacilityCategory;
  name: string;
  latitude: number;
  longitude: number;
  phone_number: string | null;
  address: string | null;
  is_emergency_service: boolean;
  verified_at: Date;
  distance_meters?: number;
}

export interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  created_at: Date;
  last_seen_at: Date;
}

export interface AuthenticatedUser {
  id: string;
  firebaseUid: string;
  phoneNumber: string;
  displayName: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
