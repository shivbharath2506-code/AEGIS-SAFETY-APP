class EmergencyContactModel {
  final String id;
  final String userId;
  final String displayName;
  final String phoneNumber;
  final String relationship;
  final bool isPrimary;
  final bool canReceiveAlerts;

  EmergencyContactModel({
    required this.id,
    required this.userId,
    required this.displayName,
    required this.phoneNumber,
    this.relationship = 'TRUSTED',
    this.isPrimary = false,
    this.canReceiveAlerts = true,
  });

  factory EmergencyContactModel.fromJson(Map<String, dynamic> json) {
    return EmergencyContactModel(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? json['userId'] ?? '',
      displayName: json['display_name'] ?? json['displayName'] ?? '',
      phoneNumber: json['phone_number'] ?? json['phoneNumber'] ?? '',
      relationship: json['relationship'] ?? 'TRUSTED',
      isPrimary: json['is_primary'] ?? json['isPrimary'] ?? false,
      canReceiveAlerts: json['can_receive_alerts'] ?? json['canReceiveAlerts'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'display_name': displayName,
      'phone_number': phoneNumber,
      'relationship': relationship,
      'is_primary': isPrimary,
      'can_receive_alerts': canReceiveAlerts,
    };
  }

  EmergencyContactModel copyWith({
    String? displayName,
    String? phoneNumber,
    String? relationship,
    bool? isPrimary,
    bool? canReceiveAlerts,
  }) {
    return EmergencyContactModel(
      id: id,
      userId: userId,
      displayName: displayName ?? this.displayName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      relationship: relationship ?? this.relationship,
      isPrimary: isPrimary ?? this.isPrimary,
      canReceiveAlerts: canReceiveAlerts ?? this.canReceiveAlerts,
    );
  }
}
