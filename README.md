# AEGIS — Advanced Emergency and Intelligent Safety

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.19%2B-02569B.svg)](https://flutter.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-336791.svg)](https://postgis.net/)
[![Tests](https://img.shields.io/badge/Tests-32%2F32%20Passing-brightgreen.svg)]()
[![Focus](https://img.shields.io/badge/Focus-Chennai%2C%20Tamil%20Nadu-orange.svg)]()

> A modern, women-focused personal safety web and mobile application. Built with reliable emergency communication, privacy-first live location sharing, verified public facilities, and safe route comparison for Chennai, Tamil Nadu.

---

## 1. Project Overview

**AEGIS** is an emergency and intelligent safety application designed to address women's safety challenges in urban environments. The initial release specifically targets the **Chennai Metropolitan Area (Tamil Nadu, India)** with extensible architecture for other cities.

### Key Capabilities:
1. **Real-Time Phone OTP Authentication**: Native Firebase Web Phone Authentication with invisible reCAPTCHA, single-use 6-digit SMS OTP verification, and server-side token validation via Firebase Admin SDK.
2. **Instant SOS Alert System**: Dual activation via press-and-hold (3 seconds) or accessible quick-tap confirmation. Automatically dispatches GPS coordinates to configured trusted contacts via SMS and push notifications.
3. **Offline & Weak Connection Resilience**: If internet connectivity is degraded or GPS is unacquired, alerts proceed with an explicit notice, queue locally in persistent cache, and retry upon network reconnection.
4. **Encrypted Live Location Sharing**: Generates short-lived, unguessable 256-bit entropy token links. Database stores only the SHA-256 digest; sharing can be terminated immediately by the user.
5. **Safe Route Comparison (Ramapuram to Koyambedu)**: Evaluates road alternatives with audited municipal streetlighting and verified public facility density (police stations, hospitals, 24x7 pharmacies). Transparently explains all scoring factors; never deceptively claims a route is "guaranteed safe".
6. **Nearby Verified Emergency Services**: Real Chennai points of interest (Koyambedu PS, Guindy PS, T. Nagar PS, MIOT Hospital, SIMS Hospital, Apollo 24x7 Pharmacies) with one-tap phone dialer and map navigation.
7. **Complete Emergency Contact Management**: Full CRUD operations, single primary contact enforcement, relationship labeling, duplicate prevention, and strict user-isolation.

---

## 2. Technology Stack

- **Web Frontend**: HTML5, Vanilla CSS3 (glassmorphic dark design system), vanilla ES6+ JavaScript, Leaflet.js maps, FontAwesome icons, Firebase JavaScript SDK (v10.14 compat).
- **Mobile Frontend**: Flutter / Dart, Material 3 design, Android runtime permissions, responsive layout, Provider state management.
- **Backend API**: Node.js, Express.js, TypeScript, Zod schema validation, centralized error handling, structured privacy-preserving logger, rate limiting.
- **Database**: PostgreSQL 16 + PostGIS for spatial queries, database migrations runner, connection retry, and automatic in-memory fallback.
- **Authentication**: Firebase Authentication (Web Phone SMS OTP verification + Firebase Admin token verification) with safe user identity preservation and account linking.
- **Notifications & SMS**: SMS provider abstraction (Mock, Fast2SMS, Twilio) + Push provider abstraction (Mock, Firebase FCM).
- **Maps & Routing**: OSRM routing provider with fallback Chennai routing engine + OpenStreetMap / PostGIS geospatial indexing.
- **DevOps**: Docker, Docker Compose, automated Jest integration tests (32/32 tests passing).

---

## 3. Firebase Phone Authentication Setup

AEGIS uses official Firebase Phone Authentication for real SMS one-time password verification without simulated logins.

### Step-by-Step Firebase Console Configuration:
1. **Create or Open Project**:
   - Go to the [Firebase Console](https://console.firebase.google.com/).
   - Create a new project or select an existing project.
2. **Enable Phone Authentication**:
   - In the left sidebar, click **Build** > **Authentication**.
   - Click the **Sign-in method** tab.
   - Select **Phone** from the providers list, toggle **Enable**, and click **Save**.
3. **Configure Authorized Domains**:
   - Under **Authentication** > **Settings** tab > **Authorized domains**.
   - Verify that `localhost` is listed. If running on a custom IP/domain, click **Add domain** and enter your hostname.
4. **Register Web Application & Obtain Web Config**:
   - In Project Settings (**Gear Icon** > **Project settings**), scroll to **Your apps**.
   - Click the **Web (</>)** icon, register the app (e.g. `AEGIS Web Portal`), and copy the `firebaseConfig` object values.
5. **Add Configuration to `backend/.env`**:
   ```env
   FIREBASE_API_KEY=AIzaSy...your-actual-api-key...
   FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=123456789012
   FIREBASE_APP_ID=1:123456789012:web:abcdef123456
   ```
6. **(Optional) Server-Side Admin Service Account**:
   - In Project Settings > **Service accounts** tab, click **Generate new private key**.
   - Set `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` in `backend/.env`.

### Quotas, SMS Costs & Testing Numbers:
- Firebase Phone Authentication provides **10 free SMS verifications per day** on the Spark (Free) plan, or thousands per month on the Blaze (Pay-as-you-go) plan via Google Identity Platform.
- You can also register authorized **Phone numbers for testing** in Firebase Console (**Authentication > Sign-in method > Phone > Phone numbers for testing**) to test specific numbers with designated verification codes without consuming cellular SMS quota.

---

## 4. Quick Start Guide

### 1. Run Backend & Tests
```bash
cd backend
npm install
npm test      # Runs all 32 automated tests (100% passing)
npm run dev   # Starts backend at http://localhost:5000
```

### 2. Access the Application
Open your browser to:
```
http://localhost:5000
```
- If Firebase configuration is not yet in `.env`, an informative notification informs you to configure `FIREBASE_API_KEY` in `backend/.env`.
- Once configured, enter your 10-digit mobile number, solve invisible reCAPTCHA, enter the received SMS OTP, and enter the AEGIS safety portal.

---

## 5. Automated Test Results
All 32 backend integration test scenarios have been run and verified:
- [x] Service health check and metadata.
- [x] Real-time phone OTP dispatch and validation.
- [x] **Firebase Configuration Endpoint**: Returns public web client config and status boolean.
- [x] **Firebase Login Validation**: Rejects missing or malformed token requests.
- [x] **Firebase Token Security**: Rejects forged or invalid JWT tokens with 401 Unauthorized.
- [x] **Safe User Migration**: Preserves existing user ID and trusted contacts when linking phone to Firebase UID.
- [x] **New User Onboarding**: Creates fresh active user records for new mobile numbers.
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
1. **SMS Delivery for SOS Emergency Alerts**: SMS for SOS broadcasts uses the provider set in `SMS_PROVIDER` (`fast2sms`, `twilio`, or `mock`). Note: Cellular SMS delivery requires an active paid account or DLT-approved template on Fast2SMS.
2. **Phone OTP Verification**: Authentication now uses **Firebase Authentication**, completely decoupled from Fast2SMS restrictions.
3. **Background Location**: Background GPS is restricted strictly to active user-initiated SOS alerts and live sharing sessions to comply with Android power-management policies and privacy regulations.

---

## 7. License
Developed as a demonstration college project. Open-source under the ISC License.
