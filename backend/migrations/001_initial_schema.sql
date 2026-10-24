-- =============================================================================
-- AEGIS Database Migration 001: Initial Schema
-- =============================================================================

-- Enable PostGIS extension if available on PostgreSQL
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "postgis";
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'PostGIS extension not available or permission denied; geospatial coordinates will rely on standard spatial indexing and geodetic calculations.';
END $$;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    verified_phone_number VARCHAR(20) UNIQUE NOT NULL,
    medical_notes TEXT,
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. EMERGENCY CONTACTS TABLE
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    relationship VARCHAR(50) NOT NULL DEFAULT 'TRUSTED' CHECK (relationship IN ('FAMILY', 'FRIEND', 'GUARDIAN', 'TRUSTED', 'OTHER')),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    can_receive_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_contact_phone UNIQUE(user_id, phone_number)
);

-- 3. SOS ALERTS TABLE
CREATE TABLE IF NOT EXISTS sos_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED', 'CANCELLED')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_accuracy_meters DOUBLE PRECISION,
    location_captured_at TIMESTAMPTZ,
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 4. SOS DELIVERIES TABLE
CREATE TABLE IF NOT EXISTS sos_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_alert_id UUID NOT NULL REFERENCES sos_alerts(id) ON DELETE CASCADE,
    emergency_contact_id UUID REFERENCES emergency_contacts(id) ON DELETE SET NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('SMS', 'PUSH', 'CALL_NOTICE')),
    status VARCHAR(25) NOT NULL DEFAULT 'CREATED' CHECK (status IN (
        'CREATED',
        'QUEUED',
        'SENDING',
        'SENT_TO_PROVIDER',
        'DELIVERED',
        'FAILED',
        'CANCELLED'
    )),
    provider_reference VARCHAR(150),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    error_code VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. LIVE LOCATION SESSIONS TABLE
CREATE TABLE IF NOT EXISTS location_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    raw_token VARCHAR(64) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    stopped_at TIMESTAMPTZ
);

-- 6. LOCATION UPDATES TABLE
CREATE TABLE IF NOT EXISTS location_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_session_id UUID NOT NULL REFERENCES location_sessions(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy_meters DOUBLE PRECISION,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. SAFETY DATA TABLE (Chennai Street Lighting, Crowd, Isolation)
CREATE TABLE IF NOT EXISTS safety_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('LIGHTING', 'CROWD', 'ISOLATED_AREA', 'FACILITY_CLUSTER')),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    confidence VARCHAR(20) NOT NULL DEFAULT 'UNVERIFIED' CHECK (confidence IN ('AUTHORITATIVE', 'LICENSED_OPEN', 'COMMUNITY_VERIFIED', 'UNVERIFIED')),
    safety_score DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    metadata JSONB DEFAULT '{}'::jsonb,
    observed_at TIMESTAMPTZ,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. NEARBY PUBLIC SAFETY & MEDICAL FACILITIES
CREATE TABLE IF NOT EXISTS nearby_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL DEFAULT 'OSM',
    external_place_id VARCHAR(100),
    category VARCHAR(30) NOT NULL CHECK (category IN ('POLICE', 'HOSPITAL', 'PHARMACY')),
    name VARCHAR(150) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    phone_number VARCHAR(30),
    address TEXT,
    is_emergency_service BOOLEAN NOT NULL DEFAULT TRUE,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. DEVICE TOKENS TABLE (FOR FCM PUSH NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    platform VARCHAR(20) NOT NULL DEFAULT 'ANDROID' CHECK (platform IN ('ANDROID', 'IOS', 'WEB')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. AUDIT EVENTS TABLE (SENSITIVE DATA-FREE SYSTEM AUDIT LOG)
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    minimal_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
