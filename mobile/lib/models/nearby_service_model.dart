class NearbyServiceModel {
  final String id;
  final String category; // POLICE, HOSPITAL, PHARMACY
  final String name;
  final double latitude;
  final double longitude;
  final String? phoneNumber;
  final String? address;
  final bool isEmergencyService;
  final int distanceMeters;
  final String distanceFormatted;

  NearbyServiceModel({
    required this.id,
    required this.category,
    required this.name,
    required this.latitude,
    required this.longitude,
    this.phoneNumber,
    this.address,
    this.isEmergencyService = true,
    required this.distanceMeters,
    required this.distanceFormatted,
  });

  factory NearbyServiceModel.fromJson(Map<String, dynamic> json) {
    return NearbyServiceModel(
      id: json['id'] ?? '',
      category: json['category'] ?? 'POLICE',
      name: json['name'] ?? '',
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      phoneNumber: json['phone_number'],
      address: json['address'],
      isEmergencyService: json['is_emergency_service'] ?? true,
      distanceMeters: json['distanceMeters'] ?? 0,
      distanceFormatted: json['distanceFormatted'] ?? '${json['distanceMeters'] ?? 0} m',
    );
  }
}
