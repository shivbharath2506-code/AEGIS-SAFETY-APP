# AEGIS — Testing Strategy & Verification Guide

### 1. Automated Test Execution
The backend contains automated integration tests executed with Jest and Supertest.

Run tests:
```bash
cd backend
npm test
```

#### Test Coverage Summary:
- **Health check**: Service status and metadata verification.
- **Authentication**: Rejection of unauthenticated requests, dev mock token injection.
- **User Isolation**: Verified User B cannot view or modify User A's contacts or alerts (returns 403 Forbidden).
- **Emergency Contacts**: CRUD, duplicate phone prevention, single primary contact enforcement.
- **SOS Alert System**: GPS-attached alert dispatch, offline/null GPS alert dispatch, resolution note attachment.
- **Delivery State Tracking**: Records `SENT_TO_PROVIDER`, `DELIVERED`, `QUEUED`, or `FAILED` per recipient.
- **Live Location Sessions**: Cryptographic token generation, unguessable token access, expiry enforcement, stop session.
- **Safe Route Comparison**: Multimodal route alternatives between Ramapuram and Koyambedu, transparent factor breakdown.
- **Nearby Services**: Geospatial distance calculations, category filtering, proximity sorting.
- **Safety Data**: Audited streetlighting metadata disclosures.

---

### 2. Manual Device Testing Checklist

| Scenario | Test Procedure | Expected AEGIS Behavior |
| :--- | :--- | :--- |
| **1. GPS Disabled** | Turn off Location in Android system settings, then trigger SOS. | SOS alert proceeds immediately without delay. Clear UI banner states "GPS location unavailable, alert dispatched with notice." |
| **2. Location Permission Denied** | Tap "Don't allow" when location runtime prompt appears. | App displays clear inline message: "Location permission needed for coordinates." User can still access helplines, fake call, and contacts. |
| **3. Weak / Offline Internet** | Enable Airplane mode, then trigger SOS. | Emergency alert is queued locally in encrypted cache (`LocalCache`). UI shows offline warning and prepares background retry upon reconnection. |
| **4. App Restart During Active Alert** | Trigger SOS, force close app, and re-open. | App restores active alert state, displaying resolution options and delivery logs. |
| **5. Fake Call Trigger** | Configure "Inspector Rajan" with 5-second delay and start simulation. | App counts down 5s, displays full-screen incoming call interface. Answering initiates realistic duration timer and voice prompt without placing external calls. |
| **6. Emergency Contacts Import** | Tap "Pick from Device Contacts" during contact creation. | Opens on-demand picker without invasive background access. Auto-populates name and 10-digit number. |
