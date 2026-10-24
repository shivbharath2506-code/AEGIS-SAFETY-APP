# AEGIS — Advanced Emergency and Intelligent Safety
## System Architecture & Technical Specification

### 1. Architectural Overview
AEGIS is an independent personal safety and emergency-response platform designed for women and vulnerable individuals in urban areas. The system emphasizes:
- **Resilient Emergency Communication**: SOS alert creation with automatic fallback when GPS or high-speed connectivity is degraded.
- **Privacy by Design**: Cryptographic token hashing, unguessable live-location tokens, strict user-data isolation, and zero background tracking without explicit user consent.
- **Transparent Route Safety**: Grounded in audited public facilities (police stations, hospitals, 24x7 pharmacies) and municipal streetlighting audits in Chennai, Tamil Nadu.

```mermaid
graph TD
    subgraph Mobile ["Mobile Frontend (Flutter / Dart)"]
        UI[Material 3 UI & Screens]
        Providers[Provider State Management]
        LocalCache[SharedPreferences Local Cache]
        OfflineQueue[Offline SOS Emergency Queue]
        Client[HTTP ApiClient]
        UI --> Providers
        Providers --> LocalCache
        Providers --> OfflineQueue
        Providers --> Client
    end

    subgraph Backend ["Backend API (Node.js / Express / TypeScript)"]
        Router["/api/v1 Versioned REST Router"]
        AuthMiddleware[Auth Middleware & Dev Mock Auth]
        RateLimiter[Express Rate Limiter]
        Modules[Domain Modules]
        
        Router --> RateLimiter
        RateLimiter --> AuthMiddleware
        AuthMiddleware --> Modules
        
        subgraph Domains ["Domain Controllers & Engines"]
            UsersMod[Users & Profile]
            ContactsMod[Emergency Contacts CRUD]
            SosMod[SOS Alert System]
            LocationMod[Live Location Sessions]
            RoutesMod[Route Comparison Engine]
            NearbyMod[Nearby Facilities]
            SafetyMod[Safety Data & Metadata]
        end
        Modules --> Domains
    end

    subgraph Integrations ["External Service Adapters"]
        SMS[SMS Provider: Mock / Fast2SMS / Twilio]
        FCM[Push Notifications: Mock / Firebase Admin]
        OSRM[OSRM / Fallback Routing Provider]
        Maps[OpenStreetMap / Google Maps Platform]
    end
    SosMod --> SMS
    SosMod --> FCM
    RoutesMod --> OSRM
    NearbyMod --> Maps

    subgraph Database ["Persistence Layer"]
        Postgres[(PostgreSQL 16 + PostGIS)]
        MemoryFallback[(In-Memory Seeded Store)]
    end
    Domains --> Postgres
    Domains -.->|Offline / Standalone Fallback| MemoryFallback
```

---

### 2. Database Entity Relationship (ER) Diagram

```mermaid
erDiagram
    USERS ||--o{ EMERGENCY_CONTACTS : "configures"
    USERS ||--o{ SOS_ALERTS : "triggers"
    USERS ||--o{ LOCATION_SESSIONS : "starts"
    USERS ||--o{ DEVICE_TOKENS : "registers"
    USERS ||--o{ AUDIT_EVENTS : "generates"
    
    SOS_ALERTS ||--o{ SOS_DELIVERIES : "dispatches"
    EMERGENCY_CONTACTS ||--o{ SOS_DELIVERIES : "receives"
    
    LOCATION_SESSIONS ||--o{ LOCATION_UPDATES : "records"

    USERS {
        uuid id PK
        varchar firebase_uid UK
        varchar display_name
        varchar verified_phone_number UK
        text medical_notes
        varchar account_status
        timestamptz created_at
        timestamptz updated_at
    }

    EMERGENCY_CONTACTS {
        uuid id PK
        uuid user_id FK
        varchar display_name
        varchar phone_number
        varchar relationship
        boolean is_primary
        boolean can_receive_alerts
        timestamptz created_at
        timestamptz updated_at
    }

    SOS_ALERTS {
        uuid id PK
        uuid user_id FK
        varchar status
        double_precision latitude
        double_precision longitude
        double_precision location_accuracy_meters
        timestamptz location_captured_at
        text resolution_note
        timestamptz created_at
        timestamptz resolved_at
    }

    SOS_DELIVERIES {
        uuid id PK
        uuid sos_alert_id FK
        uuid emergency_contact_id FK
        varchar channel
        varchar status
        varchar provider_reference
        integer attempt_count
        timestamptz last_attempt_at
        timestamptz delivered_at
        varchar error_code
        text error_message
        timestamptz created_at
    }

    LOCATION_SESSIONS {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        varchar raw_token
        boolean is_active
        timestamptz started_at
        timestamptz expires_at
        timestamptz stopped_at
    }

    LOCATION_UPDATES {
        uuid id PK
        uuid location_session_id FK
        double_precision latitude
        double_precision longitude
        double_precision accuracy_meters
        timestamptz captured_at
    }

    NEARBY_FACILITIES {
        uuid id PK
        varchar provider
        varchar category
        varchar name
        double_precision latitude
        double_precision longitude
        varchar phone_number
        text address
        boolean is_emergency_service
        timestamptz verified_at
    }

    SAFETY_DATA {
        uuid id PK
        varchar source
        varchar category
        double_precision latitude
        double_precision longitude
        varchar confidence
        double_precision safety_score
        jsonb metadata
        timestamptz observed_at
        timestamptz imported_at
    }
```

---

### 3. Chennai Urban Focus
The first release implements geographic grounding in the Chennai Metropolitan Area (Tamil Nadu, India):
- **Key Transit Hubs**: Koyambedu Bus Terminus (CMBT), Chennai Central, Guindy, Vadapalani 100ft Road, Ramapuram.
- **Verified Emergency Services**:
  - Police Stations: K10 Koyambedu, J3 Guindy, R1 Mambalam (T. Nagar), Ramapuram PS, E2 Royapettah.
  - Hospitals: Rajiv Gandhi Govt General Hospital, MIOT International, SIMS Hospital, Apollo Hospitals Greams Road.
  - 24x7 Pharmacies: Apollo Pharmacy Koyambedu & Vadapalani, MedPlus Ramapuram.
- **Authoritative Streetlighting Audit**: Greater Chennai Corporation Smart LED streetlighting layers covering primary arterial corridors.
