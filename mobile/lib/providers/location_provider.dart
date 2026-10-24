import 'package:flutter/material.dart';
import '../services/location_service.dart';
import '../models/location_session_model.dart';
import '../core/network/api_client.dart';

class LocationProvider with ChangeNotifier {
  final LocationService _locationService;
  final ApiClient _apiClient;

  CurrentLocationFix? _currentFix;
  LocationSessionModel? _activeSession;
  bool _isLocating = false;
  bool _isSessionLoading = false;
  String? _errorMessage;

  LocationProvider({
    LocationService? locationService,
    ApiClient? apiClient,
  })  : _locationService = locationService ?? LocationService(),
        _apiClient = apiClient ?? ApiClient();

  CurrentLocationFix? get currentFix => _currentFix;
  LocationSessionModel? get activeSession => _activeSession;
  bool get isLocating => _isLocating;
  bool get isSessionLoading => _isSessionLoading;
  String? get errorMessage => _errorMessage;
  bool get hasActiveSession => _activeSession != null && _activeSession!.isActive;

  Future<void> refreshLocation() async {
    _isLocating = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final hasPerm = await _locationService.requestLocationPermission();
      if (!hasPerm) {
        _errorMessage = 'Location permission is required to acquire your GPS position.';
        _isLocating = false;
        notifyListeners();
        return;
      }

      _currentFix = await _locationService.getCurrentLocation();
    } catch (e) {
      _errorMessage = 'GPS fix unavailable. Verify location settings.';
    } finally {
      _isLocating = false;
      notifyListeners();
    }
  }

  Future<bool> startLiveSharing({int durationMinutes = 60}) async {
    _isSessionLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final fix = _currentFix ?? await _locationService.getCurrentLocation();
      final res = await _apiClient.post(
        '/location-sessions',
        body: {
          'durationMinutes': durationMinutes,
          'initialLatitude': fix?.latitude,
          'initialLongitude': fix?.longitude,
          'accuracyMeters': fix?.accuracyMeters,
        },
      );

      _activeSession = LocationSessionModel.fromJson(res);
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isSessionLoading = false;
      notifyListeners();
    }
  }

  Future<bool> stopLiveSharing() async {
    if (_activeSession == null) return false;

    _isSessionLoading = true;
    notifyListeners();

    try {
      await _apiClient.post('/location-sessions/${_activeSession!.sessionId}/stop');
      _activeSession = null;
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isSessionLoading = false;
      notifyListeners();
    }
  }
}
