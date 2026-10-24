import 'package:flutter_test/flutter_test.dart';
import 'package:aegis_safety/models/emergency_contact_model.dart';

void main() {
  group('Emergency Contact Model & Rules Tests', () {
    test('JSON serialization & deserialization works correctly', () {
      final json = {
        'id': 'test-c-01',
        'user_id': 'user-01',
        'display_name': 'Amma',
        'phone_number': '+919840112233',
        'relationship': 'FAMILY',
        'is_primary': true,
        'can_receive_alerts': true,
      };

      final contact = EmergencyContactModel.fromJson(json);

      expect(contact.id, 'test-c-01');
      expect(contact.displayName, 'Amma');
      expect(contact.phoneNumber, '+919840112233');
      expect(contact.isPrimary, true);
      expect(contact.relationship, 'FAMILY');

      final serialized = contact.toJson();
      expect(serialized['id'], 'test-c-01');
      expect(serialized['display_name'], 'Amma');
    });

    test('copyWith updates specified fields only', () {
      final contact = EmergencyContactModel(
        id: 'c-1',
        userId: 'u-1',
        displayName: 'Karthik',
        phoneNumber: '+919840998877',
        relationship: 'FRIEND',
        isPrimary: false,
      );

      final updated = contact.copyWith(
        relationship: 'FAMILY',
        isPrimary: true,
      );

      expect(updated.id, 'c-1');
      expect(updated.displayName, 'Karthik');
      expect(updated.relationship, 'FAMILY');
      expect(updated.isPrimary, true);
    });
  });
}
