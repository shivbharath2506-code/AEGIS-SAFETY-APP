import 'package:flutter/material.dart';
import '../models/nearby_service_model.dart';
import '../core/network/api_client.dart';

class NearbyServicesProvider with ChangeNotifier {
  final ApiClient _apiClient;

  List<NearbyServiceModel> _facilities = [];
  String _selectedCategory = 'ALL'; // ALL, POLICE, HOSPITAL, PHARMACY
  bool _isLoading = false;
  String? _errorMessage;

  NearbyServicesProvider({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  List<NearbyServiceModel> get facilities {
    if (_selectedCategory == 'ALL') return _facilities;
    return _facilities.where((f) => f.category == _selectedCategory).toList();
  }

  String get selectedCategory => _selectedCategory;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void setCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  Future<void> fetchNearbyFacilities({
    double latitude = 13.0694,
    double longitude = 80.1948,
    int radiusMeters = 10000,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final queryParams = {
        'latitude': latitude.toString(),
        'longitude': longitude.toString(),
        'radiusMeters': radiusMeters.toString(),
      };

      final res = await _apiClient.get('/nearby-services', queryParams: queryParams);
      final rawList = (res['facilities'] as List?) ?? [];
      _facilities = rawList.map((f) => NearbyServiceModel.fromJson(f)).toList();
    } catch (e) {
      _errorMessage = 'Failed to load nearby emergency services: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
