class LocationSessionModel {
  final String sessionId;
  final String shareUrl;
  final String rawToken;
  final String startedAt;
  final String expiresAt;
  final int durationMinutes;
  final bool isActive;
  final double? latestLatitude;
  final double? latestLongitude;

  LocationSessionModel({
    required this.sessionId,
    required this.shareUrl,
    required this.rawToken,
    required this.startedAt,
    required this.expiresAt,
    required this.durationMinutes,
    this.isActive = true,
    this.latestLatitude,
    this.latestLongitude,
  });

  factory LocationSessionModel.fromJson(Map<String, dynamic> json) {
    final latestLoc = json['latestLocation'];
    return LocationSessionModel(
      sessionId: json['sessionId'] ?? '',
      shareUrl: json['shareUrl'] ?? '',
      rawToken: json['rawToken'] ?? '',
      startedAt: json['startedAt'] ?? '',
      expiresAt: json['expiresAt'] ?? '',
      durationMinutes: json['durationMinutes'] ?? 60,
      isActive: json['isActive'] ?? true,
      latestLatitude: latestLoc != null ? (latestLoc['latitude'] as num?)?.toDouble() : null,
      latestLongitude: latestLoc != null ? (latestLoc['longitude'] as num?)?.toDouble() : null,
    );
  }
}
