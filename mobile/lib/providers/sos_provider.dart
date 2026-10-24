import 'package:flutter/material.dart';
import '../models/sos_alert_model.dart';
import '../core/network/api_client.dart';
import '../core/storage/local_cache.dart';

enum SosState { idle, countdown, dispatching, active, resolved, error }

class SosProvider with ChangeNotifier {
  final ApiClient _apiClient;

  SosState _state = SosState.idle;
  SOSAlertModel? _activeAlert;
  List<SOSAlertModel> _alertHistory = [];
  String? _errorMessage;
  int _countdownSeconds = 3;

  SosProvider({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  SosState get state => _state;
  SOSAlertModel? get activeAlert => _activeAlert;
  List<SOSAlertModel> get alertHistory => _alertHistory;
  String? get errorMessage => _errorMessage;
  int get countdownSeconds => _countdownSeconds;
  bool get hasActiveAlert => _activeAlert != null && _activeAlert!.status == 'ACTIVE';

  void setCountdown(int seconds) {
    _countdownSeconds = seconds;
    notifyListeners();
  }

  void startCountdown() {
    _state = SosState.countdown;
    _countdownSeconds = 3;
    notifyListeners();
  }

  void cancelCountdown() {
    _state = SosState.idle;
    notifyListeners();
  }

  Future<bool> triggerEmergencyAlert({
    double? latitude,
    double? longitude,
    double? accuracyMeters,
  }) async {
    _state = SosState.dispatching;
    _errorMessage = null;
    notifyListeners();

    final payload = {
      'latitude': latitude,
      'longitude': longitude,
      'locationAccuracyMeters': accuracyMeters,
      'locationCapturedAt': DateTime.now().toIso8601String(),
    };

    try {
      final res = await _apiClient.post('/sos', body: payload);
      _activeAlert = SOSAlertModel.fromJson(res);
      _state = SosState.active;
      notifyListeners();
      return true;
    } catch (e) {
      // Network weak or offline: Queue emergency alert locally
      await LocalCache.queueOfflineSos(payload);

      // Create local fallback alert so UI shows active state and offline warning
      _activeAlert = SOSAlertModel(
        id: 'local-offline-${DateTime.now().millisecondsSinceEpoch}',
        status: 'ACTIVE',
        latitude: latitude,
        longitude: longitude,
        locationAccuracyMeters: accuracyMeters,
        createdAt: DateTime.now().toIso8601String(),
        locationAvailable: latitude != null,
        deliveries: [
          SOSDeliveryModel(
            id: 'offline-delivery',
            channel: 'SMS',
            status: 'QUEUED',
            errorCode: 'OFFLINE_QUEUED',
          )
        ],
      );

      _state = SosState.active;
      _errorMessage = 'Internet connection unavailable. Alert queued locally and will dispatch when online.';
      notifyListeners();
      return true;
    }
  }

  Future<bool> resolveActiveAlert({String? note}) async {
    if (_activeAlert == null) return false;

    _errorMessage = null;
    try {
      if (!_activeAlert!.id.startsWith('local-offline')) {
        await _apiClient.post(
          '/sos/${_activeAlert!.id}/resolve',
          body: {
            'resolutionNote': note ?? 'User confirmed safety restored.',
          },
        );
      }

      _state = SosState.resolved;
      _activeAlert = null;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> fetchAlertHistory() async {
    try {
      final res = await _apiClient.get('/sos');
      if (res is List) {
        _alertHistory = res.map((e) => SOSAlertModel.fromJson(e)).toList();
        notifyListeners();
      }
    } catch (_) {
      // Ignore background refresh failure
    }
  }
}
