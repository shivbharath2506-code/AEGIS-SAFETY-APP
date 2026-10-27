import request from 'supertest';
import app from '../src/app';
import { inMemoryStore } from '../src/database/inMemoryStore';
import { otpService } from '../src/modules/users/otp.service';
import { findOrCreateUserByFirebaseIdentity } from '../src/modules/users/user.service';

describe('AEGIS Backend API Automated Test Suite', () => {
  const testUserId = 'test-user-priya-01';
  const otherUserId = 'other-user-anita-02';

  beforeEach(() => {
    // Reset seed data state before tests
    inMemoryStore.seedDefaultChennaiData();
    otpService.clear();
  });

  describe('0. Web Application Page Routes (Welcome & Main Page)', () => {
    it('GET / should return 200 with AEGIS Safety Dashboard', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('dashboard-container');
      expect(res.text).toContain('btn-sos-trigger');
    });

    it('GET /home should return 200 with existing main AEGIS page', async () => {
      const res = await request(app).get('/home');
      expect(res.status).toBe(200);
      expect(res.text).toContain('dashboard-container');
      expect(res.text).toContain('btn-sos-trigger');
    });

    it('GET /index.html should redirect to /', async () => {
      const res = await request(app).get('/index.html');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/');
    });
  });

  describe('1. Health Check Endpoint', () => {
    it('GET /health should return 200 with service metadata', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
      expect(res.body.service).toContain('AEGIS');
      expect(res.body.cityFocus).toContain('Chennai');
    });
  });

  describe('1b. Real-Time Phone OTP & Authentication', () => {
    it('should dispatch real-time 6-digit OTP to mobile number', async () => {
      const res = await request(app)
        .post('/api/v1/users/auth/otp-request')
        .send({ phoneNumber: '9840112233' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phoneNumber).toBe('+919840112233');
      expect(res.body.data.expiresInSeconds).toBe(300);
      expect(res.body.data.devOtp).toBeDefined();
      expect(res.body.data.devOtp).toMatch(/^\d{6}$/);
    });

    it('should reject invalid mobile number format for OTP request', async () => {
      const res = await request(app)
        .post('/api/v1/users/auth/otp-request')
        .send({ phoneNumber: '123' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should authenticate user with valid real-time OTP and reject reused OTP', async () => {
      // Step 1: Request real-time OTP
      const reqRes = await request(app)
        .post('/api/v1/users/auth/otp-request')
        .send({ phoneNumber: '9840112233' });

      const realOtp = reqRes.body.data.devOtp;

      // Step 2: Attempt with incorrect OTP
      const failRes = await request(app)
        .post('/api/v1/users/auth/login')
        .send({
          phoneNumber: '9840112233',
          otp: '000000'
        });
      expect(failRes.status).toBe(400);
      expect(failRes.body.error.code).toBe('INVALID_OTP');

      // Step 3: Login with correct real-time OTP
      const loginRes = await request(app)
        .post('/api/v1/users/auth/login')
        .send({
          phoneNumber: '9840112233',
          otp: realOtp,
          displayName: 'Lakshmi Narayanan'
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.token).toMatch(/^aegis-token-/);
      expect(loginRes.body.data.user.verifiedPhoneNumber).toBe('+919840112233');
      expect(loginRes.body.data.user.displayName).toBe('Lakshmi Narayanan');

      // Step 4: Verify single-use policy (re-using the same OTP must fail)
      const reuseRes = await request(app)
        .post('/api/v1/users/auth/login')
        .send({
          phoneNumber: '9840112233',
          otp: realOtp
        });
      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.error.code).toBe('INVALID_OTP');
    });
  });

  describe('1c. Firebase Authentication & Identity Preservation', () => {
    it('GET /api/v1/users/auth/firebase-config should return configuration structure', async () => {
      const res = await request(app).get('/api/v1/users/auth/firebase-config');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.isConfigured).toBe('boolean');
      expect(res.body.data).toHaveProperty('apiKey');
      expect(res.body.data).toHaveProperty('authDomain');
      expect(res.body.data).toHaveProperty('projectId');
    });

    it('POST /api/v1/users/auth/firebase-login should fail validation when idToken is missing', async () => {
      const res = await request(app)
        .post('/api/v1/users/auth/firebase-login')
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('POST /api/v1/users/auth/firebase-login should reject invalid or forged Firebase ID tokens', async () => {
      const res = await request(app)
        .post('/api/v1/users/auth/firebase-login')
        .send({
          idToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature',
          displayName: 'Test Citizen'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FIREBASE_AUTH_FAILED');
    });

    it('Protected endpoints should reject invalid Firebase JWT tokens with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .get('/api/v1/emergency-contacts')
        .set('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.fakepayload.fakesignature');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('Safe user identity migration: should link Firebase UID to existing user by verified phone number and preserve contacts', () => {
      // Demo user is seeded in memory with ID 'demo-user-chennai-01' and phone '+919876543210'
      const seededUserId = 'demo-user-chennai-01';
      const existingUser = inMemoryStore.users.get(seededUserId);
      expect(existingUser).toBeDefined();
      expect(existingUser?.verified_phone_number).toBe('+919876543210');

      // Seeded contacts for user exist
      const contactsBefore = Array.from(inMemoryStore.contacts.values()).filter(c => c.user_id === seededUserId);
      expect(contactsBefore.length).toBeGreaterThan(0);

      // Simulate first-time Firebase Phone Auth login with new Firebase UID
      const migratedUser = findOrCreateUserByFirebaseIdentity(
        'firebase-uid-priya-verified-123',
        '+919876543210',
        'Priya Ramanathan'
      );

      // Must be same user record without duplicates
      expect(migratedUser.id).toBe(seededUserId);
      expect(migratedUser.firebase_uid).toBe('firebase-uid-priya-verified-123');

      // Emergency contacts must remain attached to user's ID
      const contactsAfter = Array.from(inMemoryStore.contacts.values()).filter(c => c.user_id === migratedUser.id);
      expect(contactsAfter.length).toBe(contactsBefore.length);
    });

    it('Safe user identity migration: should create new active user for previously unregistered Firebase identity', () => {
      const newPhone = '+919988112244';
      const newUid = 'firebase-uid-fresh-user-456';

      const newUser = findOrCreateUserByFirebaseIdentity(newUid, newPhone, 'Suresh K');
      expect(newUser).toBeDefined();
      expect(newUser.firebase_uid).toBe(newUid);
      expect(newUser.verified_phone_number).toBe(newPhone);
      expect(newUser.display_name).toBe('Suresh K');
      expect(newUser.account_status).toBe('ACTIVE');
    });
  });

  describe('2. Authentication & Authorization Middleware', () => {
    it('should reject protected endpoints when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/emergency-contacts');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should allow access via dev mock auth header', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('x-dev-user-id', testUserId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testUserId);
    });
  });

  describe('3. User Profile CRUD', () => {
    it('should fetch and update profile information', async () => {
      const patchRes = await request(app)
        .patch('/api/v1/users/me')
        .set('x-dev-user-id', testUserId)
        .send({
          displayName: 'Priya R',
          medicalNotes: 'Asthma inhaler in purse. Type O+ blood.'
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.displayName).toBe('Priya R');
      expect(patchRes.body.data.medicalNotes).toContain('Type O+');

      const getRes = await request(app)
        .get('/api/v1/users/me')
        .set('x-dev-user-id', testUserId);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.displayName).toBe('Priya R');
    });

    it('should fail validation when payload exceeds limits', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('x-dev-user-id', testUserId)
        .send({
          displayName: '' // Invalid min length
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('4. Emergency Contacts CRUD & User Isolation', () => {
    let createdContactId: string;

    it('should create an emergency contact for authenticated user', async () => {
      const res = await request(app)
        .post('/api/v1/emergency-contacts')
        .set('x-dev-user-id', testUserId)
        .send({
          displayName: 'Amma',
          phoneNumber: '+919840112233',
          relationship: 'FAMILY',
          isPrimary: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.display_name).toBe('Amma');
      expect(res.body.data.is_primary).toBe(true);
      createdContactId = res.body.data.id;
    });

    it('should prevent User B from viewing or updating User A contacts (User Isolation)', async () => {
      // User B tries to update User A's contact
      const updateRes = await request(app)
        .patch(`/api/v1/emergency-contacts/${createdContactId}`)
        .set('x-dev-user-id', otherUserId)
        .send({ displayName: 'Malicious Change' });

      expect(updateRes.status).toBe(403);
      expect(updateRes.body.error.code).toBe('FORBIDDEN');

      // User B tries to delete User A's contact
      const deleteRes = await request(app)
        .delete(`/api/v1/emergency-contacts/${createdContactId}`)
        .set('x-dev-user-id', otherUserId);

      expect(deleteRes.status).toBe(403);
    });

    it('should update contact by owner', async () => {
      const res = await request(app)
        .patch(`/api/v1/emergency-contacts/${createdContactId}`)
        .set('x-dev-user-id', testUserId)
        .send({ relationship: 'GUARDIAN' });

      expect(res.status).toBe(200);
      expect(res.body.data.relationship).toBe('GUARDIAN');
    });

    it('should list only contacts belonging to the requesting user', async () => {
      const res = await request(app)
        .get('/api/v1/emergency-contacts')
        .set('x-dev-user-id', testUserId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const contact of res.body.data) {
        expect(contact.user_id).toBe(testUserId);
      }
    });

    it('should delete contact by owner', async () => {
      const res = await request(app)
        .delete(`/api/v1/emergency-contacts/${createdContactId}`)
        .set('x-dev-user-id', testUserId);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });
  });

  describe('5. SOS Emergency Alert Activation & Deliveries', () => {
    it('should trigger SOS alert with valid GPS coordinates', async () => {
      const res = await request(app)
        .post('/api/v1/sos')
        .set('x-dev-user-id', 'demo-user-chennai-01')
        .send({
          latitude: 13.0694,
          longitude: 80.1948,
          locationAccuracyMeters: 8.5
        });

      expect(res.status).toBe(201);
      expect(res.body.data.alert.status).toBe('ACTIVE');
      expect(res.body.data.alert.locationAvailable).toBe(true);
      expect(res.body.data.deliveries.length).toBeGreaterThan(0);
      expect(['SENT_TO_PROVIDER', 'SIMULATED_DISPATCH', 'FAILED']).toContain(res.body.data.deliveries[0].status);
    });

    it('should trigger SOS alert even when GPS is unavailable', async () => {
      const res = await request(app)
        .post('/api/v1/sos')
        .set('x-dev-user-id', 'demo-user-chennai-01')
        .send({
          latitude: null,
          longitude: null
        });

      expect(res.status).toBe(201);
      expect(res.body.data.alert.status).toBe('ACTIVE');
      expect(res.body.data.alert.locationAvailable).toBe(false);
      expect(res.body.data.alert.latitude).toBeNull();
    });

    it('should retrieve alert history and resolve active alert', async () => {
      // 1. Trigger
      const triggerRes = await request(app)
        .post('/api/v1/sos')
        .set('x-dev-user-id', 'demo-user-chennai-01')
        .send({ latitude: 13.0418, longitude: 80.2341 });

      const alertId = triggerRes.body.data.alert.id;

      // 2. Resolve
      const resolveRes = await request(app)
        .post(`/api/v1/sos/${alertId}/resolve`)
        .set('x-dev-user-id', 'demo-user-chennai-01')
        .send({ resolutionNote: 'Reached safe public location. Assisted by security.' });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.status).toBe('RESOLVED');
      expect(resolveRes.body.data.resolutionNote).toContain('Reached safe');

      // 3. Inspect Deliveries
      const deliveriesRes = await request(app)
        .get(`/api/v1/sos/${alertId}/deliveries`)
        .set('x-dev-user-id', 'demo-user-chennai-01');

      expect(deliveriesRes.status).toBe(200);
      expect(Array.isArray(deliveriesRes.body.data)).toBe(true);
    });
  });

  describe('6. Live Location Sharing Sessions', () => {
    let sessionId: string;
    let rawToken: string;

    it('should create a live location sharing session with unguessable token', async () => {
      const res = await request(app)
        .post('/api/v1/location-sessions')
        .set('x-dev-user-id', testUserId)
        .send({
          durationMinutes: 30,
          initialLatitude: 13.0827,
          initialLongitude: 80.2707,
          accuracyMeters: 5.0
        });

      expect(res.status).toBe(201);
      expect(res.body.data.sessionId).toBeDefined();
      expect(res.body.data.rawToken).toBeDefined();
      expect(res.body.data.shareUrl).toContain(res.body.data.rawToken);

      sessionId = res.body.data.sessionId;
      rawToken = res.body.data.rawToken;
    });

    it('should allow viewing location with the unguessable token without login', async () => {
      const res = await request(app)
        .get(`/api/v1/location-sessions/${sessionId}?token=${rawToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.latestLocation.latitude).toBeCloseTo(13.0827);
    });

    it('should reject viewing location with invalid or missing token', async () => {
      const res = await request(app)
        .get(`/api/v1/location-sessions/${sessionId}?token=invalid-random-token`);

      expect(res.status).toBe(403);
    });

    it('should allow owner to stream updates and terminate session', async () => {
      const updateRes = await request(app)
        .post(`/api/v1/location-sessions/${sessionId}/updates`)
        .set('x-dev-user-id', testUserId)
        .send({
          latitude: 13.0850,
          longitude: 80.2720,
          accuracyMeters: 4.2
        });

      expect(updateRes.status).toBe(200);

      const stopRes = await request(app)
        .post(`/api/v1/location-sessions/${sessionId}/stop`)
        .set('x-dev-user-id', testUserId);

      expect(stopRes.status).toBe(200);
      expect(stopRes.body.data.stoppedAt).toBeDefined();
    });
  });

  describe('7. Safe Route Comparison', () => {
    it('should compare routes between Ramapuram and Koyambedu in Chennai', async () => {
      // Ramapuram: 13.0315, 80.1818 | Koyambedu: 13.0694, 80.1948
      const res = await request(app)
        .post('/api/v1/routes/compare')
        .send({
          originLatitude: 13.0315,
          originLongitude: 80.1818,
          destinationLatitude: 13.0694,
          destinationLongitude: 80.1948
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.alternativeCount).toBeGreaterThan(0);

      const route1 = res.body.data.routes[0];
      expect(route1.distanceMeters).toBeGreaterThan(0);
      expect(route1.durationSeconds).toBeGreaterThan(0);
      expect(route1.safetyAssessment.isGuaranteedSafe).toBe(false);
      expect(route1.safetyAssessment.scoringFactors.transparencyNote).toBeDefined();
      expect(route1.navigationHandoffUrl).toContain('google.com/maps/dir');
    });

    it('should reject route comparison with invalid coordinates', async () => {
      const res = await request(app)
        .post('/api/v1/routes/compare')
        .send({
          originLatitude: 999.0, // Invalid latitude
          originLongitude: 80.1818,
          destinationLatitude: 13.0694,
          destinationLongitude: 80.1948
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('should search places for theatres, apartments, or real-world locations (Rohini Cinemas)', async () => {
      const res = await request(app)
        .get('/api/v1/routes/places/search?q=Rohini+Cinemas');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toBeInstanceOf(Array);
      expect(res.body.data.results.length).toBeGreaterThan(0);

      const first = res.body.data.results[0];
      expect(first.name).toBeDefined();
      expect(first.latitude).toBeGreaterThan(12.0);
      expect(first.longitude).toBeGreaterThan(79.0);
      expect(first.displayName).toBeDefined();
    });

    it('should reverse geocode GPS coordinates to place/street name', async () => {
      const res = await request(app)
        .get('/api/v1/routes/places/reverse?lat=13.0758&lng=80.1958');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBeDefined();
      expect(res.body.data.displayName).toBeDefined();
      expect(res.body.data.latitude).toBeCloseTo(13.0758, 2);
    });

    it('should compare routes between specific places using exact coordinates (Rohini Cinemas to Sri Ganga Cinemas)', async () => {
      // Rohini Cinemas: 13.0758, 80.1958 | Sri Ganga Cinemas: 13.1249, 80.2176
      const res = await request(app)
        .post('/api/v1/routes/compare')
        .send({
          originLat: 13.0758,
          originLng: 80.1958,
          destLat: 13.1249,
          destLng: 80.2176
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recommendedSafeRoute).toBeDefined();
      expect(res.body.data.recommendedSafeRoute.distanceMeters).toBeGreaterThan(1000);
      expect(res.body.data.recommendedSafeRoute.isGuaranteedSafe).toBe(false);
      expect(res.body.data.recommendedSafeRoute.navigationHandoffUrl).toContain('13.0758,80.1958');
      expect(res.body.data.recommendedSafeRoute.navigationHandoffUrl).toContain('13.1249,80.2176');
    });
  });

  describe('8. Nearby Services (Police, Hospitals, Pharmacies)', () => {
    it('should list nearby facilities ordered by proximity', async () => {
      const res = await request(app)
        .get('/api/v1/nearby-services?latitude=13.0694&longitude=80.1948&radiusMeters=8000');

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBeGreaterThan(0);

      const firstFacility = res.body.data.facilities[0];
      expect(firstFacility.distanceMeters).toBeDefined();
      expect(firstFacility.phone_number).toBeDefined();
    });

    it('should filter facilities by category (POLICE)', async () => {
      const res = await request(app)
        .get('/api/v1/nearby-services?category=POLICE&radiusMeters=15000');

      expect(res.status).toBe(200);
      for (const fac of res.body.data.facilities) {
        expect(fac.category).toBe('POLICE');
      }
    });
  });

  describe('9. Safety Data & Metadata', () => {
    it('should return Chennai road lighting and isolation data', async () => {
      const res = await request(app).get('/api/v1/safety-data');
      expect(res.status).toBe(200);
      expect(res.body.data.city).toBe('Chennai');
      expect(res.body.data.points.length).toBeGreaterThan(0);
    });

    it('should return safety data audit metadata and source disclosures', async () => {
      const res = await request(app).get('/api/v1/safety-data/metadata');
      expect(res.status).toBe(200);
      expect(res.body.data.datasets.length).toBeGreaterThan(0);
      expect(res.body.data.datasets[0].disclaimer).toBeDefined();
    });
  });
});
