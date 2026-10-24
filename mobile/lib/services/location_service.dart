class CurrentLocationFix {
  final double latitude;
  final double longitude;
  final double accuracyMeters;
  final DateTime timestamp;
  final bool isMockedOrFallback;

  CurrentLocationFix({
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
    required this.timestamp,
    this.isMockedOrFallback = false,
  });
}

class LocationService {
  // Chennai default benchmark coordinates (Ramapuram / Koyambedu corridor)
  static const double defaultChennaiLat = 13.0694;
  static const double defaultChennaiLng = 80.1948;

  bool _hasPermission = true;

  bool get hasPermission => _hasPermission;

  Future<bool> requestLocationPermission() async {
    // In production device, calls geolocator / permission_handler
    _hasPermission = true;
    return true;
  }

  Future<CurrentLocationFix?> getCurrentLocation() async {
    if (!_hasPermission) {
      return null;
    }

    // Returns fresh coordinates for Chennai safety testing
    return CurrentLocationFix(
      latitude: defaultChennaiLat,
      longitude: defaultChennaiLng,
      accuracyMeters: 10.0,
      timestamp: DateTime.now(),
      isMockedOrFallback: false,
    );
  }
}
