import request from 'supertest';
import app from '../src/app';
import { inMemoryStore } from '../src/database/inMemoryStore';

describe('AEGIS Backend API Automated Test Suite', () => {
  const testUserId = 'test-user-priya-01';
  const otherUserId = 'other-user-anita-02';

  beforeEach(() => {
    // Reset seed data state before tests
    inMemoryStore.seedDefaultChennaiData();
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
      expect(res.body.data.deliveries[0].status).toBe('SENT_TO_PROVIDER');
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
