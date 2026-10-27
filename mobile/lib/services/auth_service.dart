import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../core/storage/local_cache.dart';
import '../models/user_model.dart';

class AuthService {
  final ApiClient _apiClient;

  AuthService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Requests a real-time 6-digit OTP dispatched to the specified phone number
  Future<String?> requestPhoneOtp(String phoneNumber) async {
    final cleanPhone = phoneNumber.replaceAll(RegExp(r'[^0-9+]'), '');
    final digitsOnly = cleanPhone.replaceAll('+', '');
    if (digitsOnly.length < 10) {
      throw ApiException(
        code: 'INVALID_PHONE',
        message: 'Please enter a valid 10-digit mobile number.',
        statusCode: 400,
      );
    }

    final response = await _apiClient.post(
      ApiConstants.requestOtp,
      body: {'phoneNumber': cleanPhone},
    );

    if (response is Map<String, dynamic> && response.containsKey('devOtp')) {
      return response['devOtp'] as String?;
    }
    return null;
  }

  /// Verifies real-time OTP code with AEGIS server and establishes authenticated session
  Future<UserModel> verifyOtpAndLogin({
    required String phoneNumber,
    required String otpCode,
    String? displayName,
  }) async {
    final cleanOtp = otpCode.trim();
    if (cleanOtp.length != 6) {
      throw ApiException(
        code: 'INVALID_OTP',
        message: 'Please enter a complete 6-digit verification code.',
        statusCode: 400,
      );
    }

    final response = await _apiClient.post(
      ApiConstants.loginWithPhone,
      body: {
        'phoneNumber': phoneNumber,
        'otp': cleanOtp,
        if (displayName != null && displayName.isNotEmpty) 'displayName': displayName,
      },
    );

    if (response is Map<String, dynamic>) {
      final token = response['token'] as String?;
      final userJson = response['user'] as Map<String, dynamic>?;

      if (token != null && userJson != null) {
        final user = UserModel.fromJson(userJson);
        await LocalCache.saveAuthSession(token, user.id);
        return user;
      }
    }

    throw ApiException(
      code: 'AUTH_FAILED',
      message: 'Failed to process authentication session from server response.',
      statusCode: 500,
    );
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
