class SafetyDataModel {
  final String id;
  final String source;
  final String category;
  final double latitude;
  final double longitude;
  final String confidence;
  final double safetyScore;
  final Map<String, dynamic> metadata;

  SafetyDataModel({
    required this.id,
    required this.source,
    required this.category,
    required this.latitude,
    required this.longitude,
    required this.confidence,
    required this.safetyScore,
    this.metadata = const {},
  });

  factory SafetyDataModel.fromJson(Map<String, dynamic> json) {
    return SafetyDataModel(
      id: json['id'] ?? '',
      source: json['source'] ?? '',
      category: json['category'] ?? '',
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      confidence: json['confidence'] ?? 'UNVERIFIED',
      safetyScore: (json['safety_score'] as num?)?.toDouble() ?? 5.0,
      metadata: json['metadata'] != null ? Map<String, dynamic>.from(json['metadata']) : {},
    );
  }
}
