class AuditLog {
  final String id;
  final String? userId;
  final String action;
  final String? details;
  final String? ipAddress;
  final String? userAgent;
  final DateTime createdAt;

  const AuditLog({
    required this.id, this.userId, required this.action,
    this.details, this.ipAddress, this.userAgent, required this.createdAt,
  });

  factory AuditLog.fromJson(Map<String, dynamic> json) => AuditLog(
    id: json['id'] as String,
    userId: json['userId'] as String?,
    action: json['action'] as String? ?? '',
    details: json['details'] as String?,
    ipAddress: json['ipAddress'] as String?,
    userAgent: json['userAgent'] as String?,
    createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
  );

  Map<String, dynamic> toJson() => {
    'id': id, 'userId': userId, 'action': action, 'details': details,
    'ipAddress': ipAddress, 'userAgent': userAgent,
    'createdAt': createdAt.toIso8601String(),
  };
}
