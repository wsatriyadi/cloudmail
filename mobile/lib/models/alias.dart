class Alias {
  final String id;
  final String localPart;
  final String domain;
  final String address;
  final String? description;
  final DateTime? expiresAt;
  final DateTime createdAt;

  const Alias({
    required this.id,
    required this.localPart,
    required this.domain,
    required this.address,
    this.description,
    this.expiresAt,
    required this.createdAt,
  });

  factory Alias.fromJson(Map<String, dynamic> json) => Alias(
    id: json['id'] as String,
    localPart: json['localPart'] as String? ?? '',
    domain: json['domain'] as String? ?? '',
    address: json['address'] as String? ?? '',
    description: json['description'] as String?,
    expiresAt: json['expiresAt'] != null ? DateTime.tryParse(json['expiresAt'] as String) : null,
    createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
  );

  Map<String, dynamic> toJson() => {
    'id': id, 'localPart': localPart, 'domain': domain, 'address': address,
    'description': description, 'expiresAt': expiresAt?.toIso8601String(),
    'createdAt': createdAt.toIso8601String(),
  };
}
