import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/widgets/empty_widget.dart';
import '../../core/widgets/error_widget.dart';
import '../../core/widgets/loading_widget.dart';
import '../../models/user.dart';
import 'users_provider.dart';

class UsersScreen extends ConsumerWidget {
  const UsersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(usersProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Users')),
      body: _buildBody(context, ref, state),
    );
  }

  Widget _buildBody(BuildContext context, WidgetRef ref, UsersState state) {
    if (state.isLoading) return const LoadingWidget(message: 'Loading users...');
    if (state.error != null) {
      return AppErrorWidget(
        message: state.error!,
        onRetry: () => ref.read(usersProvider.notifier).load(),
      );
    }
    if (state.users.isEmpty) {
      return const EmptyWidget(
        icon: Icons.people_outline,
        title: 'No users',
        subtitle: 'No users found',
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(usersProvider.notifier).load(),
      child: ListView.builder(
        itemCount: state.users.length,
        itemBuilder: (context, index) {
          final user = state.users[index];
          return _UserTile(
            user: user,
            onEditRole: () => _showEditRoleDialog(context, ref, user),
            onDelete: () => _confirmDelete(context, ref, user),
          );
        },
      ),
    );
  }

  void _showEditRoleDialog(BuildContext context, WidgetRef ref, User user) {
    String selectedRole = user.role;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: Text('Edit ${user.name}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Align(
                alignment: Alignment.centerLeft,
                child: Text('Role', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'user', label: Text('User')),
                  ButtonSegment(value: 'admin', label: Text('Admin')),
                ],
                selected: {selectedRole},
                onSelectionChanged: (v) => setState(() => selectedRole = v.first),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                final success = await ref.read(usersProvider.notifier).updateUser(
                  id: user.id,
                  role: selectedRole,
                );
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(success ? 'User updated' : 'Failed to update user'),
                  ));
                }
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context, WidgetRef ref, User user) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete User'),
        content: Text('Delete ${user.name} (${user.email})?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await ref.read(usersProvider.notifier).delete(user.id);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(success ? 'User deleted' : 'Failed to delete user'),
                ));
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}

class _UserTile extends StatelessWidget {
  final User user;
  final VoidCallback onEditRole;
  final VoidCallback onDelete;
  const _UserTile({required this.user, required this.onEditRole, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Dismissible(
      key: Key(user.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        color: theme.colorScheme.error,
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      confirmDismiss: (_) async {
        onDelete();
        return false;
      },
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.primaryContainer,
          child: Text(
            user.name.isNotEmpty ? user.name[0].toUpperCase() : 'U',
            style: TextStyle(color: theme.colorScheme.onPrimaryContainer),
          ),
        ),
        title: Text(user.name),
        subtitle: Text(user.email),
        trailing: ActionChip(
          label: Text(user.role.toUpperCase()),
          onPressed: onEditRole,
        ),
      ),
    );
  }
}
