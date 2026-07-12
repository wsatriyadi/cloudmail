import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../auth/auth_provider.dart';
import '../auth/auth_state.dart';

final currentIndexProvider = StateProvider<int>((ref) => 0);

class AppScaffold extends ConsumerWidget {
  final Widget child;
  const AppScaffold({super.key, required this.child});

  static const _destinations = [
    NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Dashboard'),
    NavigationDestination(icon: Icon(Icons.inbox_outlined), selectedIcon: Icon(Icons.inbox), label: 'Inbox'),
    NavigationDestination(icon: Icon(Icons.auto_awesome_outlined), selectedIcon: Icon(Icons.auto_awesome), label: 'Generate'),
    NavigationDestination(icon: Icon(Icons.more_horiz), selectedIcon: Icon(Icons.more_horiz), label: 'More'),
  ];

  static const _routes = ['/dashboard', '/inbox', '/generate'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = ref.watch(currentIndexProvider);
    final authState = ref.watch(authProvider);
    final theme = Theme.of(context);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (index) {
          if (index == 3) {
            _showDrawer(context, ref, authState, theme);
          } else {
            ref.read(currentIndexProvider.notifier).state = index;
            context.go(_routes[index]);
          }
        },
        destinations: _destinations,
      ),
    );
  }

  void _showDrawer(BuildContext context, WidgetRef ref, AuthState authState, ThemeData theme) {
    final userName = switch (authState) {
      Authenticated(:final name) => name,
      _ => 'User',
    };
    final userEmail = switch (authState) {
      Authenticated(:final email) => email,
      _ => '',
    };

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        minChildSize: 0.3,
        maxChildSize: 0.85,
        builder: (_, scrollController) => ListView(
          controller: scrollController,
          children: [
            const SizedBox(height: 8),
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(
              color: theme.colorScheme.outline.withAlpha(80), borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(children: [
                CircleAvatar(
                  backgroundColor: theme.colorScheme.primaryContainer,
                  child: Text(userName.isNotEmpty ? userName[0].toUpperCase() : 'U',
                    style: TextStyle(color: theme.colorScheme.onPrimaryContainer)),
                ),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(userName, style: theme.textTheme.titleMedium),
                  Text(userEmail, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline)),
                ])),
              ]),
            ),
            const Divider(height: 32),
            _DrawerItem(icon: Icons.alternate_email, title: 'Aliases', onTap: () { Navigator.pop(ctx); context.go('/aliases'); }),
            _DrawerItem(icon: Icons.dns_outlined, title: 'Domains', onTap: () { Navigator.pop(ctx); context.go('/domains'); }),
            _DrawerItem(icon: Icons.key_outlined, title: 'API Keys', onTap: () { Navigator.pop(ctx); context.go('/api-keys'); }),
            _DrawerItem(icon: Icons.people_outline, title: 'Users', onTap: () { Navigator.pop(ctx); context.go('/users'); }),
            _DrawerItem(icon: Icons.settings_outlined, title: 'Settings', onTap: () { Navigator.pop(ctx); context.go('/settings'); }),
            _DrawerItem(icon: Icons.history, title: 'Audit Log', onTap: () { Navigator.pop(ctx); context.go('/audit-log'); }),
            const Divider(height: 16),
            _DrawerItem(
              icon: Icons.logout,
              title: 'Logout',
              color: theme.colorScheme.error,
              onTap: () {
                Navigator.pop(ctx);
                ref.read(authProvider.notifier).logout();
                context.go('/login');
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final Color? color;
  const _DrawerItem({required this.icon, required this.title, required this.onTap, this.color});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: color),
      title: Text(title, style: color != null ? TextStyle(color: color) : null),
      onTap: onTap,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20),
    );
  }
}
