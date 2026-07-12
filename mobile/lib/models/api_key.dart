class ApiKey {
  final String id;
  final String name;
  final String? key;
  final List<String> permissions;
  final bool isActive;
  final List<String> ipWhitelist;
  final int? rateLimit;
  final DateTime createdAt;
  final DateTime? lastUsedAt;
  final String? userId;

  const ApiKey({
    required this.id, required this.name, this.key,
    this.permissions = const [], required this.isActive,
    this.ipWhitelist = const [], this.rateLimit,
    required this.createdAt, this.lastUsedAt, this.userId,
  });

  factory ApiKey.fromJson(Map<String, dynamic> json) => ApiKey(
    id: json['id'] as String,
    name: json['name'] as String? ?? '',
    key: json['key'] as String?,
    permissions: (json['permissions'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
    isActive: json['isActive'] as bool? ?? true,
    ipWhitelist: (json['ipWhitelist'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
    rateLimit: json['rateLimit'] as int?,
    createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    lastUsedAt: json['lastUsedAt'] != null ? DateTime.tryParse(json['lastUsedAt'] as String) : null,
    userId: json['userId'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'id': id, 'name': name, 'key': key, 'permissions': permissions,
    'isActive': isActive, 'ipWhitelist': ipWhitelist, 'rateLimit': rateLimit,
    'createdAt': createdAt.toIso8601String(),
    'lastUsedAt': lastUsedAt?.toIso8601String(), 'userId': userId,
  };
}
