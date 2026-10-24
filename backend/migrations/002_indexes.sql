-- =============================================================================
-- AEGIS Database Migration 002: Indexes & Constraints
-- =============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(verified_phone_number);
CREATE INDEX IF NOT EXISTS idx_users_firebase ON users(firebase_uid);

-- Emergency Contacts indexes
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_primary ON emergency_contacts(user_id, is_primary) WHERE is_primary = TRUE;

-- SOS Alerts & Deliveries indexes
CREATE INDEX IF NOT EXISTS idx_sos_alerts_user_id ON sos_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created_at ON sos_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_deliveries_alert_id ON sos_deliveries(sos_alert_id);
CREATE INDEX IF NOT EXISTS idx_sos_deliveries_status ON sos_deliveries(status);

-- Location Sessions & Updates indexes
CREATE INDEX IF NOT EXISTS idx_location_sessions_token_hash ON location_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_location_sessions_user ON location_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_location_updates_session ON location_updates(location_session_id, captured_at DESC);

-- Safety Data and Facilities spatial indexing
CREATE INDEX IF NOT EXISTS idx_safety_data_lat_lng ON safety_data(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_safety_data_category ON safety_data(category);
CREATE INDEX IF NOT EXISTS idx_facilities_lat_lng ON nearby_facilities(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_facilities_category ON nearby_facilities(category);

-- Audit Events
CREATE INDEX IF NOT EXISTS idx_audit_user_event ON audit_events(user_id, event_type);
