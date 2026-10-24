class RoutePoint {
  final double latitude;
  final double longitude;

  RoutePoint({required this.latitude, required this.longitude});

  factory RoutePoint.fromJson(Map<String, dynamic> json) {
    return RoutePoint(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
    );
  }
}

class SafetyAssessment {
  final double? safetyScore;
  final String confidenceLabel;
  final bool isGuaranteedSafe;
  final int verifiedFacilitiesNearbyCount;
  final double lightingAvailabilityRatio;
  final bool hasIsolatedWarnings;
  final String transparencyNote;

  SafetyAssessment({
    this.safetyScore,
    required this.confidenceLabel,
    this.isGuaranteedSafe = false,
    required this.verifiedFacilitiesNearbyCount,
    required this.lightingAvailabilityRatio,
    required this.hasIsolatedWarnings,
    required this.transparencyNote,
  });

  factory SafetyAssessment.fromJson(Map<String, dynamic> json) {
    final factors = json['scoringFactors'] ?? {};
    return SafetyAssessment(
      safetyScore: json['safetyScore'] != null ? (json['safetyScore'] as num).toDouble() : null,
      confidenceLabel: json['confidenceLabel'] ?? 'MODERATE',
      isGuaranteedSafe: false, // Never guaranteed safe
      verifiedFacilitiesNearbyCount: factors['verifiedFacilitiesNearbyCount'] ?? 0,
      lightingAvailabilityRatio: (factors['lightingAvailabilityRatio'] as num?)?.toDouble() ?? 0.0,
      hasIsolatedWarnings: factors['hasIsolatedWarnings'] ?? false,
      transparencyNote: factors['transparencyNote'] ?? '',
    );
  }
}

class RouteAlternativeModel {
  final String routeId;
  final String name;
  final String summary;
  final int distanceMeters;
  final int durationSeconds;
  final List<RoutePoint> coordinates;
  final SafetyAssessment safetyAssessment;
  final String navigationHandoffUrl;

  RouteAlternativeModel({
    required this.routeId,
    required this.name,
    required this.summary,
    required this.distanceMeters,
    required this.durationSeconds,
    required this.coordinates,
    required this.safetyAssessment,
    required this.navigationHandoffUrl,
  });

  factory RouteAlternativeModel.fromJson(Map<String, dynamic> json) {
    final rawCoords = (json['coordinates'] as List?) ?? [];
    return RouteAlternativeModel(
      routeId: json['routeId'] ?? '',
      name: json['name'] ?? 'Route',
      summary: json['summary'] ?? '',
      distanceMeters: json['distanceMeters'] ?? 0,
      durationSeconds: json['durationSeconds'] ?? 0,
      coordinates: rawCoords.map((c) => RoutePoint.fromJson(c)).toList(),
      safetyAssessment: SafetyAssessment.fromJson(json['safetyAssessment'] ?? {}),
      navigationHandoffUrl: json['navigationHandoffUrl'] ?? '',
    );
  }
}
