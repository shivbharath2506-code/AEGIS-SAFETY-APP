# AEGIS REST API Documentation (v1)

Base URL: `http://localhost:5000/api/v1`

---

## 1. System Health
### `GET /health`
Returns service availability, database connectivity, uptime, and memory consumption.

**Response `200 OK`:**
```json
{
  "status": "HEALTHY",
  "service": "AEGIS Emergency and Intelligent Safety API",
  "cityFocus": "Chennai, Tamil Nadu",
  "version": "1.0.0",
  "timestamp": "2026-10-24T18:00:00.000Z",
  "databaseConnected": true,
  "mockAuthActive": true,
  "uptimeSeconds": 120,
  "memoryUsageMb": 48
}
```

---

## 2. User Profile
### `GET /api/v1/users/me`
*Headers: `Authorization: Bearer <token>` or `x-dev-user-id: <user_id>`*

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "demo-user-chennai-01",
    "displayName": "Priya Ramanathan",
    "verifiedPhoneNumber": "+919876543210",
    "medicalNotes": "Asthma inhaler in purse. Blood group: B positive.",
    "accountStatus": "ACTIVE"
  }
}
```

### `PATCH /api/v1/users/me`
Updates user profile fields.
```json
{
  "displayName": "Priya R",
  "medicalNotes": "Allergic to penicillin. Type B+ blood."
}
```

---

## 3. Emergency Contacts
### `GET /api/v1/emergency-contacts`
Retrieves contacts configured by the authenticated user, prioritized by primary contact.

### `POST /api/v1/emergency-contacts`
```json
{
  "displayName": "Amma",
  "phoneNumber": "+919840112233",
  "relationship": "FAMILY",
  "isPrimary": true,
  "canReceiveAlerts": true
}
```

### `PATCH /api/v1/emergency-contacts/:id`
Updates contact name, phone, relationship, or primary status. Enforces strict user ownership isolation.

### `DELETE /api/v1/emergency-contacts/:id`
Deletes contact. Protected by user isolation.

---

## 4. SOS Emergency System
### `POST /api/v1/sos`
Dispatches an emergency alert to all configured emergency contacts.
*Rate Limited: Max 10 calls per minute.*

**Request:**
```json
{
  "latitude": 13.0694,
  "longitude": 80.1948,
  "locationAccuracyMeters": 8.5
}
```
*Note: If GPS is unavailable, `latitude` and `longitude` can be omitted or passed as null. The alert proceeds with an explicit "Location Unavailable" note.*

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Emergency alert created and dispatched to 2 trusted contact(s).",
  "data": {
    "alert": {
      "id": "alert-uuid-1234",
      "status": "ACTIVE",
      "latitude": 13.0694,
      "longitude": 80.1948,
      "locationAvailable": true
    },
    "deliveries": [
      {
        "id": "del-01",
        "channel": "SMS",
        "status": "SENT_TO_PROVIDER",
        "contactId": "contact-01",
        "providerRef": "mock-sms-179284-3851"
      }
    ]
  }
}
```

### `POST /api/v1/sos/:id/resolve`
Marks active emergency alert as resolved.
```json
{
  "resolutionNote": "Reached safe public area. Assisted by family."
}
```

---

## 5. Live Location Sharing
### `POST /api/v1/location-sessions`
Creates an encrypted, time-limited live sharing session with an unguessable token.

**Request:**
```json
{
  "durationMinutes": 60,
  "initialLatitude": 13.0827,
  "initialLongitude": 80.2707
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session-uuid-5678",
    "shareUrl": "https://aegis-safety.app/live?session=session-uuid-5678&token=a8f9c1b...",
    "expiresAt": "2026-10-24T19:00:00.000Z",
    "durationMinutes": 60
  }
}
```

### `GET /api/v1/location-sessions/:id?token=<raw_token>`
Retrieves live coordinates. Accessible by session owner or recipient with valid unguessable access token. Returns 403 if token is missing/invalid or 410 if expired.

---

## 6. Safe Route Comparison
### `POST /api/v1/routes/compare`
Compares route alternatives between two geographic coordinates with transparent safety scoring.

**Request:**
```json
{
  "originLatitude": 13.0315,
  "originLongitude": 80.1818,
  "destinationLatitude": 13.0694,
  "destinationLongitude": 80.1948
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "alternativeCount": 2,
    "routes": [
      {
        "routeId": "route-alt-1",
        "name": "Via Jawaharlal Nehru Salai (100 Ft Rd / Inner Ring)",
        "distanceMeters": 8450,
        "durationSeconds": 1280,
        "safetyAssessment": {
          "safetyScore": 8.5,
          "confidenceLabel": "AUTHORITATIVE",
          "isGuaranteedSafe": false,
          "scoringFactors": {
            "verifiedFacilitiesNearbyCount": 3,
            "lightingAvailabilityRatio": 0.85,
            "hasIsolatedWarnings": false,
            "transparencyNote": "Calculated from 3 verified facilities and audited arterial streetlighting. Route is never guaranteed safe."
          }
        },
        "navigationHandoffUrl": "https://www.google.com/maps/dir/?api=1&origin=13.0315,80.1818&destination=13.0694,80.1948"
      }
    ]
  }
}
```

---

## 7. Nearby Services
### `GET /api/v1/nearby-services`
Query parameters:
- `latitude`: User's latitude (default 13.0827)
- `longitude`: User's longitude (default 80.2707)
- `category`: `POLICE`, `HOSPITAL`, or `PHARMACY` (optional)
- `radiusMeters`: Search radius (default 10000m)

Returns list of facilities sorted in ascending order of distance from current position.
