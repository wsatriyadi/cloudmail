class ActivityData {
  final String date;
  final int count;

  const ActivityData({required this.date, required this.count});

  factory ActivityData.fromJson(Map<String, dynamic> json) => ActivityData(
    date: json['date'] as String? ?? '',
    count: json['count'] as int? ?? 0,
  );

  Map<String, dynamic> toJson() => {'date': date, 'count': count};
}

class DashboardStats {
  final int totalEmails;
  final int totalDomains;
  final int totalApiKeys;
  final int totalUsers;
  final int todayEmails;
  final int activeDomains;
  final int activeApiKeys;
  final List<ActivityData> activityData;

  const DashboardStats({
    required this.totalEmails, required this.totalDomains, required this.totalApiKeys,
    required this.totalUsers, required this.todayEmails, required this.activeDomains,
    required this.activeApiKeys, required this.activityData,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) => DashboardStats(
    totalEmails: json['totalEmails'] as int? ?? 0,
    totalDomains: json['totalDomains'] as int? ?? 0,
    totalApiKeys: json['totalApiKeys'] as int? ?? 0,
    totalUsers: json['totalUsers'] as int? ?? 0,
    todayEmails: json['todayEmails'] as int? ?? 0,
    activeDomains: json['activeDomains'] as int? ?? 0,
    activeApiKeys: json['activeApiKeys'] as int? ?? 0,
    activityData: (json['activityData'] as List<dynamic>?)
        ?.map((e) => ActivityData.fromJson(e as Map<String, dynamic>))
        .toList() ?? [],
  );

  Map<String, dynamic> toJson() => {
    'totalEmails': totalEmails, 'totalDomains': totalDomains, 'totalApiKeys': totalApiKeys,
    'totalUsers': totalUsers, 'todayEmails': todayEmails, 'activeDomains': activeDomains,
    'activeApiKeys': activeApiKeys, 'activityData': activityData.map((a) => a.toJson()).toList(),
  };
}
