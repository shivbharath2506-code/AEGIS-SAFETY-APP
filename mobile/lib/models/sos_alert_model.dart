class SOSDeliveryModel {
  final String id;
  final String channel;
  final String status;
  final String? contactId;
  final String? providerRef;
  final String? errorCode;

  SOSDeliveryModel({
    required this.id,
    required this.channel,
    required this.status,
    this.contactId,
    this.providerRef,
    this.errorCode,
  });

  factory SOSDeliveryModel.fromJson(Map<String, dynamic> json) {
    return SOSDeliveryModel(
      id: json['id'] ?? '',
      channel: json['channel'] ?? 'SMS',
      status: json['status'] ?? 'QUEUED',
      contactId: json['contactId'] ?? json['emergency_contact_id'],
      providerRef: json['providerRef'] ?? json['provider_reference'],
      errorCode: json['errorCode'] ?? json['error_code'],
    );
  }
}

class SOSAlertModel {
  final String id;
  final String status;
  final double? latitude;
  final double? longitude;
  final double? locationAccuracyMeters;
  final String createdAt;
  final String? resolvedAt;
  final String? resolutionNote;
  final bool locationAvailable;
  final List<SOSDeliveryModel> deliveries;

  SOSAlertModel({
    required this.id,
    required this.status,
    this.latitude,
    this.longitude,
    this.locationAccuracyMeters,
    required this.createdAt,
    this.resolvedAt,
    this.resolutionNote,
    this.locationAvailable = false,
    this.deliveries = const [],
  });

  factory SOSAlertModel.fromJson(Map<String, dynamic> json) {
    final alertData = json['alert'] ?? json;
    final rawDeliveries = (json['deliveries'] as List?) ?? [];

    return SOSAlertModel(
      id: alertData['id'] ?? '',
      status: alertData['status'] ?? 'ACTIVE',
      latitude: alertData['latitude'] != null ? (alertData['latitude'] as num).toDouble() : null,
      longitude: alertData['longitude'] != null ? (alertData['longitude'] as num).toDouble() : null,
      locationAccuracyMeters: alertData['locationAccuracyMeters'] != null
          ? (alertData['locationAccuracyMeters'] as num).toDouble()
          : null,
      createdAt: alertData['createdAt'] ?? DateTime.now().toIso8601String(),
      resolvedAt: alertData['resolvedAt'],
      resolutionNote: alertData['resolutionNote'],
      locationAvailable: alertData['locationAvailable'] ?? (alertData['latitude'] != null),
      deliveries: rawDeliveries.map((d) => SOSDeliveryModel.fromJson(d)).toList(),
    );
  }
}
