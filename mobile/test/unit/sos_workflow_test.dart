import 'package:flutter_test/flutter_test.dart';
import 'package:aegis_safety/models/sos_alert_model.dart';

void main() {
  group('SOS Emergency Workflow & Model Tests', () {
    test('Correctly maps active SOS alert with GPS coordinates', () {
      final json = {
        'id': 'sos-alert-101',
        'status': 'ACTIVE',
        'latitude': 13.0694,
        'longitude': 80.1948,
        'locationAccuracyMeters': 6.2,
        'createdAt': '2026-10-24T18:00:00.000Z',
        'locationAvailable': true,
        'deliveries': [
          {
            'id': 'del-01',
            'channel': 'SMS',
            'status': 'SENT_TO_PROVIDER',
            'providerRef': 'mock-sms-1234',
          },
          {
            'id': 'del-02',
            'channel': 'PUSH',
            'status': 'SENT_TO_PROVIDER',
            'providerRef': 'fcm-batch-1',
          }
        ]
      };

      final alert = SOSAlertModel.fromJson(json);

      expect(alert.id, 'sos-alert-101');
      expect(alert.status, 'ACTIVE');
      expect(alert.locationAvailable, true);
      expect(alert.latitude, 13.0694);
      expect(alert.deliveries.length, 2);
      expect(alert.deliveries[0].status, 'SENT_TO_PROVIDER');
    });

    test('Handles offline/unavailable GPS gracefully', () {
      final json = {
        'id': 'sos-alert-offline-02',
        'status': 'ACTIVE',
        'latitude': null,
        'longitude': null,
        'createdAt': '2026-10-24T18:00:00.000Z',
        'locationAvailable': false,
        'deliveries': []
      };

      final alert = SOSAlertModel.fromJson(json);

      expect(alert.locationAvailable, false);
      expect(alert.latitude, isNull);
      expect(alert.longitude, isNull);
    });
  });
}
