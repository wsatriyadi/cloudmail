import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../auth/auth_provider.dart';
import '../auth/auth_state.dart';
import '../widgets/app_scaffold.dart';
import '../../features/auth/login_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/inbox/inbox_screen.dart';
import '../../features/email_view/email_view_screen.dart';
import '../../features/generate/generate_screen.dart';
import '../../features/aliases/aliases_screen.dart';
import '../../features/domains/domains_screen.dart';
import '../../features/api_keys/api_keys_screen.dart';
import '../../features/users/users_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../features/audit_log/audit_log_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final isAuth = authState is Authenticated;
      final isLoginRoute = state.matchedLocation == '/login';

      if (!isAuth && !isLoginRoute && authState is! AuthLoading && authState is! AuthInitial) {
        return '/login';
      }
      if (isAuth && isLoginRoute) {
        return '/dashboard';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => AppScaffold(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            pageBuilder: (context, state) => NoTransitionPage(child: const DashboardScreen()),
          ),
          GoRoute(
            path: '/inbox',
            pageBuilder: (context, state) => NoTransitionPage(child: const InboxScreen()),
          ),
          GoRoute(
            path: '/generate',
            pageBuilder: (context, state) => NoTransitionPage(child: const GenerateScreen()),
          ),
          GoRoute(
            path: '/aliases',
            pageBuilder: (context, state) => NoTransitionPage(child: const AliasesScreen()),
          ),
          GoRoute(
            path: '/domains',
            pageBuilder: (context, state) => NoTransitionPage(child: const DomainsScreen()),
          ),
          GoRoute(
            path: '/api-keys',
            pageBuilder: (context, state) => NoTransitionPage(child: const ApiKeysScreen()),
          ),
          GoRoute(
            path: '/users',
            pageBuilder: (context, state) => NoTransitionPage(child: const UsersScreen()),
          ),
          GoRoute(
            path: '/settings',
            pageBuilder: (context, state) => NoTransitionPage(child: const SettingsScreen()),
          ),
          GoRoute(
            path: '/audit-log',
            pageBuilder: (context, state) => NoTransitionPage(child: const AuditLogScreen()),
          ),
        ],
      ),
      GoRoute(
        path: '/email/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return EmailViewScreen(emailId: id);
        },
      ),
    ],
  );
});
