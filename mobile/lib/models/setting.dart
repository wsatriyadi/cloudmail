class Setting {
  final String key;
  final String value;
  final String? description;

  const Setting({required this.key, required this.value, this.description});

  factory Setting.fromJson(Map<String, dynamic> json) => Setting(
    key: json['key'] as String? ?? '',
    value: json['value']?.toString() ?? '',
    description: json['description'] as String?,
  );

  Map<String, dynamic> toJson() => {'key': key, 'value': value, 'description': description};
}
