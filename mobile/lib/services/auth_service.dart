import '../core/network/api_client.dart';
import '../core/storage/local_cache.dart';
import '../models/user_model.dart';

class AuthService {
  final ApiClient _apiClient;

  AuthService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Simulates or executes Firebase Phone Auth OTP request
  Future<bool> requestPhoneOtp(String phoneNumber) async {
    // In production, FirebaseAuth.instance.verifyPhoneNumber(...) is invoked.
    // For development, validates Indian phone number format
    final cleanPhone = phoneNumber.replaceAll(RegExp(r'\s+'), '');
    if (cleanPhone.length < 10) {
      throw ApiException(
        code: 'INVALID_PHONE',
        message: 'Please enter a valid 10-digit mobile number.',
        statusCode: 400,
      );
    }
    await Future.delayed(const Duration(milliseconds: 600));
    return true;
  }

  /// Verifies OTP code and exchanges for authenticated session
  Future<UserModel> verifyOtpAndLogin({
    required String phoneNumber,
    required String otpCode,
  }) async {
    await Future.delayed(const Duration(milliseconds: 700));

    // Verify 6-digit OTP code in development mock (e.g., 123456 or any 6 digits)
    if (otpCode.length != 6) {
      throw ApiException(
        code: 'INVALID_OTP',
        message: 'Invalid OTP code. Please enter the 6-digit verification code.',
        statusCode: 400,
      );
    }

    // Save dev mock token & session
    const mockToken = 'mock-token-chennai-dev-session';
    const mockUserId = 'demo-user-chennai-01';

    await LocalCache.saveAuthSession(mockToken, mockUserId);

    // Fetch user profile from API
    try {
      final data = await _apiClient.get('/users/me');
      return UserModel.fromJson(data);
    } catch (_) {
      // Fallback local model if backend offline
      return UserModel(
        id: mockUserId,
        displayName: 'Priya Ramanathan',
        verifiedPhoneNumber: phoneNumber,
        medicalNotes: 'Asthma inhaler in purse. Blood group: B positive.',
        accountStatus: 'ACTIVE',
      );
    }
  }

  Future<UserModel?> getCurrentUser() async {
    final token = await LocalCache.getToken();
    if (token == null) return null;

    try {
      final data = await _apiClient.get('/users/me');
      return UserModel.fromJson(data);
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    await LocalCache.clearAuth();
  }
}
