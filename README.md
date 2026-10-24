# AEGIS — Advanced Emergency and Intelligent Safety

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.19%2B-02569B.svg)](https://flutter.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-336791.svg)](https://postgis.net/)
[![Tests](https://img.shields.io/badge/Tests-23%2F23%20Passing-brightgreen.svg)]()
[![Focus](https://img.shields.io/badge/Focus-Chennai%2C%20Tamil%20Nadu-orange.svg)]()

> A women-focused personal safety application inspired by the emergency-response concept of the **Tamil Nadu Police Kavalan** app. Built with reliable emergency communication, privacy-first live location sharing, verified public facilities, and safe route comparison for Chennai, Tamil Nadu.

---

## 1. Project Overview

**AEGIS** is an emergency and intelligent safety application designed to address women's safety challenges in urban environments. The initial release specifically targets the **Chennai Metropolitan Area (Tamil Nadu, India)** with extensible architecture for other cities.

### Key Capabilities:
1. **Instant SOS Alert System**: Dual activation via press-and-hold (3 seconds) or accessible quick-tap confirmation. Automatically dispatches GPS coordinates to configured trusted contacts via SMS and push notifications.
2. **Offline & Weak Connection Resilience**: If internet connectivity is degraded or GPS is unacquired, alerts proceed with an explicit notice, queue locally in persistent cache, and retry upon network reconnection.
3. **Encrypted Live Location Sharing**: Generates short-lived, unguessable 256-bit entropy token links. Database stores only the SHA-256 digest; sharing can be terminated immediately by the user.
4. **Safe Route Comparison (Ramapuram to Koyambedu)**: Evaluates road alternatives with audited municipal streetlighting and verified public facility density (police stations, hospitals, 24x7 pharmacies). Transparently explains all scoring factors; never deceptively claims a route is "guaranteed safe".
5. **Nearby Verified Emergency Services**: Real Chennai points of interest (Koyambedu PS, Guindy PS, T. Nagar PS, MIOT Hospital, SIMS Hospital, Apollo 24x7 Pharmacies) with one-tap phone dialer and map navigation.
6. **Fake Incoming Call Simulator**: Discreetly excuse yourself from uncomfortable situations with configurable caller names ("Appa (Dad)", "Brother Karthik", "Office Manager"), countdown delay, realistic ringing screen, and simulated voice prompts.
7. **Complete Emergency Contact Management**: Full CRUD operations, single primary contact enforcement, relationship labeling, duplicate prevention, and strict user-isolation.

---

## 2. Technology Stack

- **Mobile Frontend**: Flutter / Dart, Material 3 design, Android runtime permissions, responsive layout, Provider state management.
- **Backend API**: Node.js, Express.js, TypeScript, Zod schema validation, centralized error handling, structured privacy-preserving logger, rate limiting.
- **Database**: PostgreSQL 16 + PostGIS for spatial queries, database migrations runner, connection retry, and automatic in-memory fallback.
- **Authentication**: Firebase Authentication with phone-number OTP + development mock authentication (strictly isolated, disabled in production).
- **Notifications & SMS**: SMS provider abstraction (Mock, Fast2SMS, Twilio) + Push provider abstraction (Mock, Firebase FCM).
- **Maps & Routing**: OSRM routing provider with fallback Chennai routing engine + OpenStreetMap / PostGIS geospatial indexing.
- **DevOps**: Docker, Docker Compose, automated Jest integration tests.

---

## 3. Project Structure

```
AEGIS-OOPS/
├── docker-compose.yml              # Local PostgreSQL + PostGIS and Backend services
├── .env.example                    # Complete environment variables template
├── .gitignore                      # Security-hardened gitignore for Node & Flutter
├── README.md                       # Master documentation
├── docs/                           # Detailed technical documentation
│   ├── architecture.md             # System design, data flows & ER diagram
│   ├── setup.md                    # Step-by-step setup guide
│   ├── api.md                      # REST API endpoint reference
│   ├── privacy_and_security.md     # Security charter & threat model
│   ├── testing.md                  # Test suite results & manual device checklist
│   └── deployment.md               # Production deployment runbook
├── backend/                        # Node.js + Express + TypeScript Backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── migrations/                 # SQL database migrations
│   │   ├── 001_initial_schema.sql  # Users, contacts, SOS, sessions, facilities
│   │   └── 002_indexes.sql         # Spatial & composite indexes
│   ├── src/
│   │   ├── app.ts                  # Express setup, security middlewares, routing
│   │   ├── server.ts               # HTTP bootstrap & graceful shutdown
│   │   ├── config/                 # Zod-validated environment config
│   │   ├── types/                  # TypeScript domain models & Express types
│   │   ├── utils/                  # Privacy logger, crypto, geo distance
│   │   ├── database/               # PG pool, migrator, seed, in-memory store
│   │   ├── middleware/             # Auth, validation, rate limiter, errors
│   │   ├── integrations/           # SMS, Push, and Maps/OSRM adapters
│   │   └── modules/                # Users, contacts, SOS, location, routes, nearby
│   └── tests/
│       └── api.test.ts             # 23 automated integration tests (100% passing)
└── mobile/                         # Flutter Mobile Application (Android-first)
    ├── pubspec.yaml
    ├── android/                    # Android manifest with permissions & gradle
    ├── lib/
    │   ├── main.dart               # MultiProvider application entry point
    │   ├── app/                    # Theme, routing, and splash logic
    │   ├── core/                   # Theme, colors, helplines, HTTP client, storage
    │   ├── models/                 # Models for Users, Contacts, SOS, Routes
    │   ├── services/               # Auth, GPS location, fake call services
    │   ├── providers/              # State management for SOS, contacts, routes
    │   ├── widgets/                # SOS button, facility cards, status badges
    │   └── features/               # Auth, Onboarding, Dashboard, SOS, Maps, etc.
    └── test/                       # Unit and widget tests
```

---

## 4. Quick Start Guide

### 1. Run Backend & Tests
```bash
cd backend
npm install
npm test      # Runs all 23 automated tests
npm run dev   # Starts backend at http://localhost:5000
```

### 2. Verify Health Check
Open your browser or run:
```bash
curl http://localhost:5000/health
```

### 3. Run Mobile App (Flutter)
```bash
cd mobile
flutter pub get
flutter run
```

---

## 5. Automated Test Results
All 23 backend integration test scenarios have been run and verified:
- [x] Service health check and metadata.
- [x] Authentication rejection on protected endpoints.
- [x] Dev mock auth injection.
- [x] User profile retrieval and updating.
- [x] Emergency contact CRUD.
- [x] **Strict User Isolation**: Verified User B cannot view, modify, or delete User A's contacts (returns 403 Forbidden).
- [x] SOS alert creation with valid GPS coordinates.
- [x] SOS alert creation when GPS is offline/unavailable.
- [x] Per-recipient delivery tracking (`SENT_TO_PROVIDER`).
- [x] Alert resolution with safety notes.
- [x] Live location session creation with unguessable tokens.
- [x] Token access validation (rejects invalid token with 403).
- [x] Route comparison between Ramapuram and Koyambedu.
- [x] Transparent safety scoring breakdown.
- [x] Nearby police, hospitals, and pharmacy proximity sorting.
- [x] Safety metadata audit disclosures.

---

## 6. Known Limitations & Configuration Notice
1. **SMS Delivery**: Default provider is set to `mock` for zero cost and safe testing. To send real SMS messages, configure `SMS_PROVIDER=fast2sms` or `twilio` with valid credentials in `.env`.
2. **Push Notifications**: Firebase Admin SDK credentials (`serviceAccountKey.json`) are required for live cloud push delivery; mock fallback is active by default.
3. **Background Location**: Background GPS is restricted strictly to active user-initiated SOS alerts and live sharing sessions to comply with Android power-management policies and privacy regulations.

---

## 7. License
Developed as a demonstration college project. Open-source under the ISC License.
