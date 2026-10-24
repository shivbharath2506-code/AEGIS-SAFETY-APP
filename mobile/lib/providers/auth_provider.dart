import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../core/storage/local_cache.dart';

enum AuthStatus { initial, unauthenticated, authenticating, authenticated }

class AuthProvider with ChangeNotifier {
  final AuthService _authService;

  AuthStatus _status = AuthStatus.initial;
  UserModel? _user;
  String? _errorMessage;
  bool _isOnboardingDone = false;

  AuthProvider({AuthService? authService})
      : _authService = authService ?? AuthService();

  AuthStatus get status => _status;
  UserModel? get user => _user;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  bool get isOnboardingDone => _isOnboardingDone;

  Future<void> checkAuthStatus() async {
    _status = AuthStatus.authenticating;
    notifyListeners();

    _isOnboardingDone = await LocalCache.isOnboardingCompleted();
    final token = await LocalCache.getToken();

    if (token != null) {
      _user = await _authService.getCurrentUser();
      _status = _user != null ? AuthStatus.authenticated : AuthStatus.unauthenticated;
    } else {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> sendOtp(String phoneNumber) async {
    _errorMessage = null;
    notifyListeners();
    try {
      return await _authService.requestPhoneOtp(phoneNumber);
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> verifyOtp(String phoneNumber, String otpCode) async {
    _status = AuthStatus.authenticating;
    _errorMessage = null;
    notifyListeners();

    try {
      _user = await _authService.verifyOtpAndLogin(
        phoneNumber: phoneNumber,
        otpCode: otpCode,
      );
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _status = AuthStatus.unauthenticated;
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> completeOnboarding() async {
    await LocalCache.setOnboardingCompleted(true);
    _isOnboardingDone = true;
    notifyListeners();
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
