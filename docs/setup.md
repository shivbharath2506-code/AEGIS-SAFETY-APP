# AEGIS — Installation and Environment Setup Guide

### 1. Prerequisites
- **Node.js**: v20 or v22+
- **npm**: v10+
- **Flutter SDK**: v3.19+ (Dart 3.3+)
- **Android Studio** with Android SDK 34 build tools (for mobile testing)
- **Docker & Docker Compose** (optional, for local PostgreSQL + PostGIS)
- **Git**

---

### 2. Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start PostgreSQL with PostGIS (Optional / Docker):**
   ```bash
   docker compose up -d postgres
   ```
   *Note: If Docker is not running, the AEGIS backend automatically boots with its pre-seeded in-memory store containing Chennai facilities and demo users, allowing zero-friction local development and testing.*

5. **Run database migrations (when PostgreSQL is active):**
   ```bash
   npm run migrate
   npm run seed
   ```

6. **Start the backend development server:**
   ```bash
   npm run dev
   ```
   Server will start at `http://localhost:5000`. Health check is available at `http://localhost:5000/health`.

7. **Execute automated tests:**
   ```bash
   npm test
   ```

---

### 3. Mobile Setup (Flutter)

1. **Navigate to mobile directory:**
   ```bash
   cd mobile
   ```

2. **Fetch packages:**
   ```bash
   flutter pub get
   ```

3. **Configure API Endpoint:**
   - In `lib/core/constants/api_constants.dart`:
     - Android Emulator: `http://10.0.2.2:5000/api/v1`
     - Physical Android device over Wi-Fi: `http://<YOUR_COMPUTER_IP>:5000/api/v1`

4. **Run the Flutter application:**
   ```bash
   flutter run
   ```

---

### 4. Real-Time Phone Authentication & OTP Verification
- Enter any valid 10-digit mobile number in the mobile app or web portal.
- The server dispatches a dynamic, real-time 6-digit OTP via the configured SMS provider (Fast2SMS or Twilio; in development/mock SMS mode, the code is logged in the backend terminal).
- Enter the received 6-digit OTP code to verify and access your account.
- **Security Guardrails**:
  - OTPs expire automatically after 5 minutes (300 seconds).
  - Single-use policy: OTP is consumed immediately upon successful verification.
  - Rate limiting: 30-second cooldown between resend requests and maximum 5 failed verification attempts before invalidation.
