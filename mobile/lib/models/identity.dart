class GeneratedIdentity {
  final String firstName;
  final String lastName;
  final String username;
  final String gender;
  final String dateOfBirth;
  final String email;
  final String domain;

  const GeneratedIdentity({
    required this.firstName, required this.lastName, required this.username,
    required this.gender, required this.dateOfBirth, required this.email, required this.domain,
  });

  factory GeneratedIdentity.fromJson(Map<String, dynamic> json) => GeneratedIdentity(
    firstName: json['firstName'] as String? ?? '',
    lastName: json['lastName'] as String? ?? '',
    username: json['username'] as String? ?? '',
    gender: json['gender'] as String? ?? '',
    dateOfBirth: json['dateOfBirth'] as String? ?? '',
    email: json['email'] as String? ?? '',
    domain: json['domain'] as String? ?? '',
  );

  Map<String, dynamic> toJson() => {
    'firstName': firstName, 'lastName': lastName, 'username': username,
    'gender': gender, 'dateOfBirth': dateOfBirth, 'email': email, 'domain': domain,
  };

  String get fullName => '$firstName $lastName';
}
