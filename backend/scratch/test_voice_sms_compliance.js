const http = require('http');

function postJson(urlPath, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJson(urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: urlPath,
      method: 'GET',
      headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runComplianceTests() {
  console.log('=== AEGIS VOICE, SMS & SOS COMPLIANCE VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate user via real-time OTP request & verification
    const otpRes = await postJson('/api/v1/users/auth/otp-request', {
      phoneNumber: '9840112233'
    });
    const otpCode = otpRes.data?.data?.devOtp;
    const loginRes = await postJson('/api/v1/users/auth/login', {
      phoneNumber: '9840112233',
      otp: otpCode,
      displayName: 'Compliance Tester'
    });
    assert(loginRes.status === 200 && loginRes.data.data.token, 'User authentication returns 200 with JWT');
    const token = loginRes.data.data.token;
    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // Clean up any existing contacts first
    const existingContacts = await getJson('/api/v1/emergency-contacts', authHeaders);
    if (existingContacts.status === 200 && Array.isArray(existingContacts.data.data)) {
      for (const ec of existingContacts.data.data) {
        await postJson(`/api/v1/emergency-contacts/${ec.id}`, {}, { ...authHeaders, 'x-http-method-override': 'DELETE' });
      }
    }

    const testSuffix = Date.now().toString().slice(-6);
    const testPhone1 = `+919840${testSuffix}`;
    const testPhone2 = `9080${testSuffix}`;

    // 2. Add two emergency contacts (one primary, one secondary)
    const c1 = await postJson('/api/v1/emergency-contacts', {
      displayName: 'Primary Guardian',
      phoneNumber: testPhone1,
      relationship: 'FAMILY',
      isPrimary: true,
      canReceiveAlerts: true
    }, authHeaders);
    assert(c1.status === 201, 'Primary contact created with E.164 phone');

    const c2 = await postJson('/api/v1/emergency-contacts', {
      displayName: 'Secondary Friend',
      phoneNumber: testPhone2,
      relationship: 'FRIEND',
      isPrimary: false,
      canReceiveAlerts: true
    }, authHeaders);
    assert(c2.status === 201, 'Secondary contact created with local 10-digit phone');

    // 3. Trigger Emergency SOS
    const sosRes = await postJson('/api/v1/sos/trigger', {
      latitude: 13.0827,
      longitude: 80.2707,
      accuracyMeters: 8,
      triggerMethod: 'TEST_SUITE'
    }, authHeaders);

    assert(sosRes.status === 201, 'SOS Trigger returns 201 Created');
    const alert = sosRes.data.data.alert;
    const dispatches = sosRes.data.data.dispatches;

    assert(alert && alert.id, 'SOS Alert object has unique ID');
    assert(alert.googleMapsUrl && alert.googleMapsUrl.includes('maps.google.com'), 'Alert contains static Google Maps coordinates URL');
    assert(alert.liveTrackingUrl && alert.liveTrackingUrl.includes('track.html'), 'Alert contains distinct live tracking URL');
    assert(alert.liveSessionId, 'Alert contains active live location session ID');
    assert(Array.isArray(dispatches) && dispatches.length >= 2, 'Independent delivery dispatches created for each saved contact');

    // Check independent dispatch properties
    const primaryDispatch = dispatches.find(d => d.recipientPhone === testPhone1);
    assert(primaryDispatch && (primaryDispatch.status === 'SENT_TO_PROVIDER' || primaryDispatch.status === 'SIMULATED_DISPATCH'), 'Primary contact dispatch recorded with delivery status');
    assert(primaryDispatch && typeof primaryDispatch.isSimulated === 'boolean', 'Dispatch explicitly flags whether simulated dev mode or real provider');

    // 4. Verify recipient can load the live tracking URL
    const sessionRes = await getJson(`/api/v1/location-sessions/${alert.liveSessionId}`, authHeaders);
    assert(sessionRes.status === 200 && sessionRes.data.data.id === alert.liveSessionId, 'Live location session is queryable by recipient token / session ID');

    // 5. Test Emergency Outbound Voice Calling endpoint
    const voiceRes = await postJson('/api/v1/sos/call', {
      latitude: 13.0827,
      longitude: 80.2707
    }, authHeaders);

    assert(voiceRes.status === 200, 'POST /api/v1/sos/call returns 200');
    assert(voiceRes.data.data && voiceRes.data.data.contactPhone === testPhone1, `Emergency voice call targeted primary contact (${testPhone1})`);
    assert(typeof voiceRes.data.data.isSimulated === 'boolean', 'Voice call response flags simulation status accurately');

    // 6. Test Outbound Voice Call for specific alert ID
    const alertVoiceRes = await postJson(`/api/v1/sos/${alert.id}/call`, {}, authHeaders);
    assert(alertVoiceRes.status === 200, `POST /api/v1/sos/${alert.id}/call succeeds for active alert`);

    // 7. Resolve SOS alert
    const resolveRes = await postJson('/api/v1/sos/resolve', {
      alertId: alert.id,
      resolutionNotes: 'Compliance test complete.'
    }, authHeaders);
    assert(resolveRes.status === 200, 'SOS Alert resolved cleanly with 200');

    // 8. Clean up created contacts
    await postJson(`/api/v1/emergency-contacts/${c1.data.data.id}`, {}, { ...authHeaders, 'method': 'DELETE' }).catch(() => {});

  } catch (err) {
    console.error('Unexpected error:', err);
    failed++;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed === 0) {
    console.log('ALL VOICE, SMS & SOS COMPLIANCE TESTS PASSED!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runComplianceTests();
