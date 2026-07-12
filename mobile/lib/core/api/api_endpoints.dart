class ApiEndpoints {
  static const String baseUrl = 'https://delix.biz.id';

  static const String csrfToken = '/api/auth/csrf';
  static const String loginCallback = '/api/auth/callback/credentials';
  static const String session = '/api/auth/session';
  static const String signOut = '/api/auth/signout';

  static const String stats = '/api/dashboard/stats';
  static const String emails = '/api/dashboard/emails';
  static String emailById(String id) => '/api/dashboard/emails/$id';
  static const String domains = '/api/dashboard/domains';
  static const String aliases = '/api/dashboard/aliases';
  static const String apiKeys = '/api/dashboard/api-keys';
  static const String users = '/api/dashboard/users';
  static const String settings = '/api/dashboard/settings';
  static const String auditLog = '/api/dashboard/audit-log';

  static String attachment(String id) => '/api/inbox/attachment/$id';

  static const String generate = '/api/generate';
}
