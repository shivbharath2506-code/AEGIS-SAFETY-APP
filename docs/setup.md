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

### 4. Development Mock Authentication Mode
In development mode (`DEV_MOCK_AUTH=true`):
- Mobile login can be performed with phone number `9876543210` and OTP `123456`.
- The backend authenticates requests using the `x-dev-user-id` header or standard mock bearer tokens.
- **Production Guardrail**: In `NODE_ENV=production`, mock auth is disabled and rejected with `401 UNAUTHORIZED`.
