import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/widgets/empty_widget.dart';
import '../../core/widgets/error_widget.dart';
import '../../core/widgets/loading_widget.dart';
import '../../models/alias.dart';
import 'aliases_provider.dart';

class AliasesScreen extends ConsumerWidget {
  const AliasesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(aliasesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Aliases')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(context, ref),
        child: const Icon(Icons.add),
      ),
      body: _buildBody(context, ref, state),
    );
  }

  Widget _buildBody(BuildContext context, WidgetRef ref, AliasesState state) {
    if (state.isLoading) return const LoadingWidget(message: 'Loading aliases...');
    if (state.error != null) {
      return AppErrorWidget(
        message: state.error!,
        onRetry: () => ref.read(aliasesProvider.notifier).load(),
      );
    }
    if (state.aliases.isEmpty) {
      return const EmptyWidget(
        icon: Icons.alternate_email,
        title: 'No aliases',
        subtitle: 'Create an alias to get started',
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(aliasesProvider.notifier).load(),
      child: ListView.builder(
        itemCount: state.aliases.length,
        itemBuilder: (context, index) {
          final alias = state.aliases[index];
          return _AliasTile(
            alias: alias,
            onDelete: () => _confirmDelete(context, ref, alias),
          );
        },
      ),
    );
  }

  void _showCreateDialog(BuildContext context, WidgetRef ref) {
    final localPartController = TextEditingController();
    final domainController = TextEditingController();
    final descriptionController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Create Alias'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: localPartController,
                decoration: const InputDecoration(labelText: 'Local Part', hintText: 'e.g. myalias'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: domainController,
                decoration: const InputDecoration(labelText: 'Domain', hintText: 'e.g. example.com'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descriptionController,
                decoration: const InputDecoration(labelText: 'Description (optional)'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              if (localPartController.text.isEmpty || domainController.text.isEmpty) return;
              Navigator.pop(ctx);
              final success = await ref.read(aliasesProvider.notifier).create(
                localPart: localPartController.text.trim(),
                domain: domainController.text.trim(),
                description: descriptionController.text.trim().isNotEmpty
                    ? descriptionController.text.trim()
                    : null,
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(success ? 'Alias created' : 'Failed to create alias'),
                ));
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, WidgetRef ref, Alias alias) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Alias'),
        content: Text('Delete ${alias.address}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await ref.read(aliasesProvider.notifier).delete(alias.id);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(success ? 'Alias deleted' : 'Failed to delete alias'),
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

class _AliasTile extends StatelessWidget {
  final Alias alias;
  final VoidCallback onDelete;
  const _AliasTile({required this.alias, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Dismissible(
      key: Key(alias.id),
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
        leading: const CircleAvatar(child: Icon(Icons.alternate_email)),
        title: Text(alias.address),
        subtitle: Text(
          alias.description ?? '${alias.localPart}@${alias.domain}',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: alias.expiresAt != null
            ? Chip(label: Text('Expires', style: theme.textTheme.labelSmall))
            : null,
      ),
    );
  }
}
