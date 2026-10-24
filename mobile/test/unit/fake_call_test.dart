import 'package:flutter_test/flutter_test.dart';
import 'package:aegis_safety/providers/fake_call_provider.dart';

void main() {
  group('Fake Call Simulator Logic Tests', () {
    late FakeCallProvider provider;

    beforeEach(() {
      provider = FakeCallProvider();
    });

    test('Initial state should be idle with default caller', () {
      expect(provider.state, FakeCallState.idle);
      expect(provider.callerName, 'Appa (Dad)');
      expect(provider.delaySeconds, 5);
      expect(provider.callDurationSeconds, 0);
    });

    test('Configuring caller and delay updates state correctly', () {
      provider.setCaller('Inspector Rajan', '+91 94440 10000');
      provider.setDelay(10);

      expect(provider.callerName, 'Inspector Rajan');
      expect(provider.callerNumber, '+91 94440 10000');
      expect(provider.delaySeconds, 10);
    });

    test('Answering call moves state to activeCall', () {
      provider.answerCall();
      expect(provider.state, FakeCallState.activeCall);
      expect(provider.callDurationSeconds, 0);
    });

    test('Declining or ending call moves state to ended and cleans up', () {
      provider.answerCall();
      provider.declineOrEndCall();
      expect(provider.state, FakeCallState.ended);
    });
  });
}
