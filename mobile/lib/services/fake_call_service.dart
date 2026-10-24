import 'dart:async';

class FakeCallConfig {
  final String callerName;
  final String callerNumber;
  final int delaySeconds;

  const FakeCallConfig({
    required this.callerName,
    required this.callerNumber,
    required this.delaySeconds,
  });
}

class FakeCallService {
  Timer? _countdownTimer;

  void scheduleFakeCall({
    required FakeCallConfig config,
    required Function() onTrigger,
  }) {
    cancelPendingCall();
    _countdownTimer = Timer(Duration(seconds: config.delaySeconds), () {
      onTrigger();
    });
  }

  void cancelPendingCall() {
    _countdownTimer?.cancel();
    _countdownTimer = null;
  }
}
