import 'dart:async';
import 'package:flutter/material.dart';

enum FakeCallState { idle, countdown, ringing, activeCall, ended }

class FakeCallProvider with ChangeNotifier {
  FakeCallState _state = FakeCallState.idle;
  String _callerName = 'Appa (Dad)';
  String _callerNumber = '+91 98401 12233';
  int _delaySeconds = 5;
  int _countdownRemaining = 5;

  Timer? _countdownTimer;
  Timer? _callDurationTimer;
  int _callDurationSeconds = 0;

  FakeCallState get state => _state;
  String get callerName => _callerName;
  String get callerNumber => _callerNumber;
  int get delaySeconds => _delaySeconds;
  int get countdownRemaining => _countdownRemaining;
  int get callDurationSeconds => _callDurationSeconds;

  String get formattedCallDuration {
    final minutes = (_callDurationSeconds ~/ 60).toString().padLeft(2, '0');
    final seconds = (_callDurationSeconds % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  void setCaller(String name, String number) {
    _callerName = name;
    _callerNumber = number;
    notifyListeners();
  }

  void setDelay(int seconds) {
    _delaySeconds = seconds;
    notifyListeners();
  }

  void startSimulation() {
    _cancelTimers();
    _state = FakeCallState.countdown;
    _countdownRemaining = _delaySeconds;
    notifyListeners();

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdownRemaining > 1) {
        _countdownRemaining--;
        notifyListeners();
      } else {
        timer.cancel();
        _triggerRinging();
      }
    });
  }

  void _triggerRinging() {
    _state = FakeCallState.ringing;
    notifyListeners();
  }

  void answerCall() {
    _state = FakeCallState.activeCall;
    _callDurationSeconds = 0;
    notifyListeners();

    _callDurationTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _callDurationSeconds++;
      notifyListeners();
    });
  }

  void declineOrEndCall() {
    _cancelTimers();
    _state = FakeCallState.ended;
    notifyListeners();

    // Reset back to idle after 1 second
    Future.delayed(const Duration(milliseconds: 1000), () {
      _state = FakeCallState.idle;
      _callDurationSeconds = 0;
      notifyListeners();
    });
  }

  void cancelSimulation() {
    _cancelTimers();
    _state = FakeCallState.idle;
    notifyListeners();
  }

  void _cancelTimers() {
    _countdownTimer?.cancel();
    _countdownTimer = null;
    _callDurationTimer?.cancel();
    _callDurationTimer = null;
  }

  @override
  void dispose() {
    _cancelTimers();
    super.dispose();
  }
}
