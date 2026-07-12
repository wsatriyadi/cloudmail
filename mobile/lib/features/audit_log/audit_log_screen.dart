import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/widgets/empty_widget.dart';
import '../../core/widgets/error_widget.dart';
import '../../core/widgets/loading_widget.dart';
import '../../models/audit_log.dart';
import 'audit_log_provider.dart';

class AuditLogScreen extends ConsumerStatefulWidget {
  const AuditLogScreen({super.key});

  @override
  ConsumerState<AuditLogScreen> createState() => _AuditLogScreenState();
}

class _AuditLogScreenState extends ConsumerState<AuditLogScreen> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(auditLogProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(auditLogProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Audit Log')),
      body: _buildBody(state),
    );
  }

  Widget _buildBody(AuditLogState state) {
    if (state.isLoading) return const LoadingWidget(message: 'Loading audit log...');
    if (state.error != null) {
      return AppErrorWidget(
        message: state.error!,
        onRetry: () => ref.read(auditLogProvider.notifier).load(),
      );
    }
    if (state.logs.isEmpty) {
      return const EmptyWidget(
        icon: Icons.history,
        title: 'No audit logs',
        subtitle: 'Activity will appear here',
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(auditLogProvider.notifier).load(),
      child: ListView.builder(
        controller: _scrollController,
        itemCount: state.logs.length + (state.isLoadingMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == state.logs.length) {
            return const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            );
          }
          return _AuditLogTile(log: state.logs[index]);
        },
      ),
    );
  }
}

class _AuditLogTile extends StatelessWidget {
  final AuditLog log;
  const _AuditLogTile({required this.log});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: theme.colorScheme.secondaryContainer,
        child: Icon(_iconForAction(log.action), size: 18,
          color: theme.colorScheme.onSecondaryContainer),
      ),
      title: Text(log.action),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (log.details != null && log.details!.isNotEmpty)
            Text(log.details!, maxLines: 2, overflow: TextOverflow.ellipsis),
          Row(
            children: [
              if (log.userId != null) ...[
                Icon(Icons.person, size: 12, color: theme.colorScheme.outline),
                const SizedBox(width: 4),
                Text(log.userId!, style: theme.textTheme.labelSmall),
                const SizedBox(width: 8),
              ],
              if (log.ipAddress != null) ...[
                Icon(Icons.lan, size: 12, color: theme.colorScheme.outline),
                const SizedBox(width: 4),
                Text(log.ipAddress!, style: theme.textTheme.labelSmall),
                const SizedBox(width: 8),
              ],
              Icon(Icons.access_time, size: 12, color: theme.colorScheme.outline),
              const SizedBox(width: 4),
              Text(_formatDateTime(log.createdAt), style: theme.textTheme.labelSmall),
            ],
          ),
        ],
      ),
      isThreeLine: log.details != null && log.details!.isNotEmpty,
    );
  }

  IconData _iconForAction(String action) {
    final lower = action.toLowerCase();
    if (lower.contains('create') || lower.contains('add')) return Icons.add_circle_outline;
    if (lower.contains('delete') || lower.contains('remove')) return Icons.remove_circle_outline;
    if (lower.contains('update') || lower.contains('edit')) return Icons.edit;
    if (lower.contains('login') || lower.contains('auth')) return Icons.login;
    if (lower.contains('logout')) return Icons.logout;
    return Icons.info_outline;
  }

  String _formatDateTime(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')} '
        '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}
