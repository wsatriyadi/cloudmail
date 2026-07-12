class Domain {
  final String id;
  final String domain;
  final bool isActive;
  final DateTime createdAt;

  const Domain({required this.id, required this.domain, required this.isActive, required this.createdAt});

  factory Domain.fromJson(Map<String, dynamic> json) => Domain(
    id: json['id'] as String,
    domain: json['domain'] as String,
    isActive: json['isActive'] as bool? ?? true,
    createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
  );

  Map<String, dynamic> toJson() => {
    'id': id, 'domain': domain, 'isActive': isActive, 'createdAt': createdAt.toIso8601String(),
  };
}
