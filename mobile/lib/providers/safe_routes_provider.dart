import 'package:flutter/material.dart';
import '../models/route_comparison_model.dart';
import '../core/network/api_client.dart';

class SafeRoutesProvider with ChangeNotifier {
  final ApiClient _apiClient;

  // Chennai benchmark route defaults: Ramapuram -> Koyambedu
  String _originName = 'Ramapuram (Mount-Poonamallee Rd)';
  double _originLat = 13.0315;
  double _originLng = 80.1818;

  String _destinationName = 'Koyambedu (CMBT Metro Junction)';
  double _destLat = 13.0694;
  double _destLng = 80.1948;

  List<RouteAlternativeModel> _routes = [];
  int _selectedRouteIndex = 0;
  bool _isLoading = false;
  String? _errorMessage;

  SafeRoutesProvider({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  String get originName => _originName;
  double get originLat => _originLat;
  double get originLng => _originLng;
  String get destinationName => _destinationName;
  double get destLat => _destLat;
  double get destLng => _destLng;

  List<RouteAlternativeModel> get routes => _routes;
  int get selectedRouteIndex => _selectedRouteIndex;
  RouteAlternativeModel? get selectedRoute =>
      _routes.isNotEmpty ? _routes[_selectedRouteIndex] : null;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void selectRoute(int index) {
    if (index >= 0 && index < _routes.length) {
      _selectedRouteIndex = index;
      notifyListeners();
    }
  }

  void setCoordinates({
    required String originName,
    required double originLat,
    required double originLng,
    required String destinationName,
    required double destLat,
    required double destLng,
  }) {
    _originName = originName;
    _originLat = originLat;
    _originLng = originLng;
    _destinationName = destinationName;
    _destLat = destLat;
    _destLng = destLng;
    notifyListeners();
  }

  Future<void> compareRoutes() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _apiClient.post(
        '/routes/compare',
        body: {
          'originLatitude': _originLat,
          'originLongitude': _originLng,
          'destinationLatitude': _destLat,
          'destinationLongitude': _destLng,
        },
      );

      final rawRoutes = (res['routes'] as List?) ?? [];
      _routes = rawRoutes.map((r) => RouteAlternativeModel.fromJson(r)).toList();
      _selectedRouteIndex = 0;
    } catch (e) {
      _errorMessage = 'Failed to calculate route alternatives: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
