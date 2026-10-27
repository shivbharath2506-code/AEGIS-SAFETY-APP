class ApiConstants {
  // Configurable base URL:
  // Android emulator: http://10.0.2.2:5000/api/v1
  // Real device or local web: http://192.168.1.x:5000/api/v1 or http://localhost:5000/api/v1
  static const String defaultBaseUrl = 'http://10.0.2.2:5000/api/v1';

  // Endpoints
  static const String health = '/health';
  static const String requestOtp = '/users/auth/otp-request';
  static const String loginWithPhone = '/users/auth/login';
  static const String userProfile = '/users/me';
  static const String emergencyContacts = '/emergency-contacts';
  static const String sos = '/sos';
  static const String locationSessions = '/location-sessions';
  static const String compareRoutes = '/routes/compare';
  static const String nearbyServices = '/nearby-services';
  static const String safetyData = '/safety-data';
  static const String safetyMetadata = '/safety-data/metadata';
}
