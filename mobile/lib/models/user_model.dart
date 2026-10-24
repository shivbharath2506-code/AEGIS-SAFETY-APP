class UserModel {
  final String id;
  final String? firebaseUid;
  final String? displayName;
  final String verifiedPhoneNumber;
  final String? medicalNotes;
  final String accountStatus;

  UserModel({
    required this.id,
    this.firebaseUid,
    this.displayName,
    required this.verifiedPhoneNumber,
    this.medicalNotes,
    this.accountStatus = 'ACTIVE',
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      firebaseUid: json['firebaseUid'],
      displayName: json['displayName'],
      verifiedPhoneNumber: json['verifiedPhoneNumber'] ?? '',
      medicalNotes: json['medicalNotes'],
      accountStatus: json['accountStatus'] ?? 'ACTIVE',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'firebaseUid': firebaseUid,
      'displayName': displayName,
      'verifiedPhoneNumber': verifiedPhoneNumber,
      'medicalNotes': medicalNotes,
      'accountStatus': accountStatus,
    };
  }
}
