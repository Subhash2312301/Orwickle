enum UserRole {
  student,
  investor,
  buyer,
  admin,
}

enum UserStatus {
  pendingVerification,
  active,
  suspended,
}

class UserModel {
  final String id;
  final String email;
  final UserRole role;
  final UserStatus status;
  final String? displayName;
  final String? phone;
  final String? bio;
  final String? avatarUrl;
  final DateTime? emailVerifiedAt;

  const UserModel({
    required this.id,
    required this.email,
    required this.role,
    required this.status,
    this.displayName,
    this.phone,
    this.bio,
    this.avatarUrl,
    this.emailVerifiedAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final profile = json['profile'] as Map<String, dynamic>?;

    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      role: _parseRole(json['role'] as String?),
      status: _parseStatus(json['status'] as String?),
      displayName: profile?['display_name'] as String?,
      phone: profile?['phone'] as String?,
      bio: profile?['bio'] as String?,
      avatarUrl: profile?['avatar_url'] as String?,
      emailVerifiedAt: json['email_verified_at'] != null
          ? DateTime.tryParse(json['email_verified_at'] as String)
          : null,
    );
  }

  static UserRole _parseRole(String? role) {
    switch (role?.toLowerCase()) {
      case 'investor':
        return UserRole.investor;
      case 'buyer':
        return UserRole.buyer;
      case 'admin':
        return UserRole.admin;
      case 'student':
      default:
        return UserRole.student;
    }
  }

  static UserStatus _parseStatus(String? status) {
    switch (status?.toLowerCase()) {
      case 'active':
        return UserStatus.active;
      case 'suspended':
        return UserStatus.suspended;
      case 'pending_verification':
      default:
        return UserStatus.pendingVerification;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'role': role.name,
      'status': status.name,
      'profile': {
        'display_name': displayName,
        'phone': phone,
        'bio': bio,
        'avatar_url': avatarUrl,
      },
    };
  }
}
