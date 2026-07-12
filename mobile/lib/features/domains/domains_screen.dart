import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/widgets/empty_widget.dart';
import '../../core/widgets/error_widget.dart';
import '../../core/widgets/loading_widget.dart';
import '../../models/domain.dart';
import 'domains_provider.dart';

class DomainsScreen extends ConsumerWidget {
  const DomainsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(domainsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Domains')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(context, ref),
        child: const Icon(Icons.add),
      ),
      body: _buildBody(context, ref, state),
    );
  }

  Widget _buildBody(BuildContext context, WidgetRef ref, DomainsState state) {
    if (state.isLoading) return const LoadingWidget(message: 'Loading domains...');
    if (state.error != null) {
      return AppErrorWidget(
        message: state.error!,
        onRetry: () => ref.read(domainsProvider.notifier).load(),
      );
    }
    if (state.domains.isEmpty) {
      return const EmptyWidget(
        icon: Icons.dns_outlined,
        title: 'No domains',
        subtitle: 'Add a domain to start receiving emails',
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(domainsProvider.notifier).load(),
      child: ListView.builder(
        itemCount: state.domains.length,
        itemBuilder: (context, index) {
          final domain = state.domains[index];
          return _DomainTile(
            domain: domain,
            onToggle: (active) => ref.read(domainsProvider.notifier).toggleActive(domain.id, active),
            onDelete: () => _confirmDelete(context, ref, domain),
          );
        },
      ),
    );
  }

  void _showCreateDialog(BuildContext context, WidgetRef ref) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Domain'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'Domain', hintText: 'e.g. example.com'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              if (controller.text.isEmpty) return;
              Navigator.pop(ctx);
              final success = await ref.read(domainsProvider.notifier).create(controller.text.trim());
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(success ? 'Domain added' : 'Failed to add domain'),
                ));
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, WidgetRef ref, Domain domain) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Domain'),
        content: Text('Delete ${domain.domain}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await ref.read(domainsProvider.notifier).delete(domain.id);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(success ? 'Domain deleted' : 'Failed to delete domain'),
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

class _DomainTile extends StatelessWidget {
  final Domain domain;
  final ValueChanged<bool> onToggle;
  final VoidCallback onDelete;
  const _DomainTile({required this.domain, required this.onToggle, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: Key(domain.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        color: Theme.of(context).colorScheme.error,
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      confirmDismiss: (_) async {
        onDelete();
        return false;
      },
      child: ListTile(
        leading: const CircleAvatar(child: Icon(Icons.dns)),
        title: Text(domain.domain),
        subtitle: Text('Created ${_formatDate(domain.createdAt)}'),
        trailing: Switch(
          value: domain.isActive,
          onChanged: onToggle,
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }
}
