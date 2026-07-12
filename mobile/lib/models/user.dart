class User {
  final String id;
  final String name;
  final String email;
  final String role;
  final DateTime createdAt;

  const User({
    required this.id, required this.name, required this.email,
    required this.role, required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    email: json['email'] as String? ?? '',
    role: json['role'] as String? ?? 'user',
    createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
  );

  Map<String, dynamic> toJson() => {
    'id': id, 'name': name, 'email': email, 'role': role,
    'createdAt': createdAt.toIso8601String(),
  };
}
