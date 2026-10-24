import 'package:flutter/material.dart';
import '../models/emergency_contact_model.dart';
import '../core/network/api_client.dart';
import '../core/storage/local_cache.dart';

class EmergencyContactsProvider with ChangeNotifier {
  final ApiClient _apiClient;

  List<EmergencyContactModel> _contacts = [];
  bool _isLoading = false;
  String? _errorMessage;

  EmergencyContactsProvider({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  List<EmergencyContactModel> get contacts => _contacts;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  EmergencyContactModel? get primaryContact {
    try {
      return _contacts.firstWhere((c) => c.isPrimary);
    } catch (_) {
      return _contacts.isNotEmpty ? _contacts.first : null;
    }
  }

  Future<void> fetchContacts() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final data = await _apiClient.get('/emergency-contacts');
      if (data is List) {
        _contacts = data.map((e) => EmergencyContactModel.fromJson(e)).toList();
        // Update local cache
        await LocalCache.cacheContacts(_contacts.map((c) => c.toJson()).toList());
      }
    } catch (e) {
      // Fallback to offline cached contacts
      final cached = await LocalCache.getCachedContacts();
      if (cached.isNotEmpty) {
        _contacts = cached.map((e) => EmergencyContactModel.fromJson(e)).toList();
      } else {
        _errorMessage = 'Could not load contacts: ${e.toString()}';
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> addContact({
    required String displayName,
    required String phoneNumber,
    String relationship = 'TRUSTED',
    bool isPrimary = false,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _apiClient.post(
        '/emergency-contacts',
        body: {
          'displayName': displayName,
          'phoneNumber': phoneNumber,
          'relationship': relationship,
          'isPrimary': isPrimary,
          'canReceiveAlerts': true,
        },
      );

      final newContact = EmergencyContactModel.fromJson(res);
      if (isPrimary) {
        _contacts = _contacts.map((c) => c.copyWith(isPrimary: false)).toList();
      }
      _contacts.insert(0, newContact);
      await LocalCache.cacheContacts(_contacts.map((c) => c.toJson()).toList());
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateContact({
    required String contactId,
    String? displayName,
    String? phoneNumber,
    String? relationship,
    bool? isPrimary,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _apiClient.patch(
        '/emergency-contacts/$contactId',
        body: {
          if (displayName != null) 'displayName': displayName,
          if (phoneNumber != null) 'phoneNumber': phoneNumber,
          if (relationship != null) 'relationship': relationship,
          if (isPrimary != null) 'isPrimary': isPrimary,
        },
      );

      final updated = EmergencyContactModel.fromJson(res);
      final index = _contacts.indexWhere((c) => c.id == contactId);
      if (index != -1) {
        if (isPrimary == true) {
          _contacts = _contacts.map((c) => c.copyWith(isPrimary: false)).toList();
        }
        _contacts[index] = updated;
      }
      await LocalCache.cacheContacts(_contacts.map((c) => c.toJson()).toList());
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> deleteContact(String contactId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _apiClient.delete('/emergency-contacts/$contactId');
      _contacts.removeWhere((c) => c.id == contactId);
      await LocalCache.cacheContacts(_contacts.map((c) => c.toJson()).toList());
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
