import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class LocalCache {
  static const String _tokenKey = 'aegis_auth_token';
  static const String _userIdKey = 'aegis_user_id';
  static const String _onboardingCompleteKey = 'aegis_onboarding_completed';
  static const String _cachedContactsKey = 'aegis_cached_contacts';
  static const String _offlineSosQueueKey = 'aegis_offline_sos_queue';

  // Auth State
  static Future<void> saveAuthSession(String token, String userId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_userIdKey, userId);
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<String?> getUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_userIdKey);
  }

  static Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userIdKey);
  }

  // Onboarding
  static Future<void> setOnboardingCompleted(bool completed) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_onboardingCompleteKey, completed);
  }

  static Future<bool> isOnboardingCompleted() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_onboardingCompleteKey) ?? false;
  }

  // Emergency Contacts Offline Cache
  static Future<void> cacheContacts(List<Map<String, dynamic>> contacts) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_cachedContactsKey, jsonEncode(contacts));
  }

  static Future<List<Map<String, dynamic>>> getCachedContacts() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_cachedContactsKey);
    if (data == null) return [];
    try {
      final List decoded = jsonDecode(data);
      return decoded.map((e) => Map<String, dynamic>.from(e)).toList();
    } catch (_) {
      return [];
    }
  }

  // Offline SOS Queue for weak or no network scenarios
  static Future<void> queueOfflineSos(Map<String, dynamic> alertPayload) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getOfflineSosQueue();
    queue.add(alertPayload);
    await prefs.setString(_offlineSosQueueKey, jsonEncode(queue));
  }

  static Future<List<Map<String, dynamic>>> getOfflineSosQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_offlineSosQueueKey);
    if (data == null) return [];
    try {
      final List decoded = jsonDecode(data);
      return decoded.map((e) => Map<String, dynamic>.from(e)).toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> clearOfflineSosQueue() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_offlineSosQueueKey);
  }
}
