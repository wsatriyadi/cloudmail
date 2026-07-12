import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/widgets/empty_widget.dart';
import '../../core/widgets/error_widget.dart';
import '../../core/widgets/loading_widget.dart';
import '../../models/api_key.dart';
import 'api_keys_provider.dart';

class ApiKeysScreen extends ConsumerWidget {
  const ApiKeysScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(apiKeysProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('API Keys')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(context, ref),
        child: const Icon(Icons.add),
      ),
      body: _buildBody(context, ref, state),
    );
  }

  Widget _buildBody(BuildContext context, WidgetRef ref, ApiKeysState state) {
    if (state.isLoading) return const LoadingWidget(message: 'Loading API keys...');
    if (state.error != null) {
      return AppErrorWidget(
        message: state.error!,
        onRetry: () => ref.read(apiKeysProvider.notifier).load(),
      );
    }
    if (state.apiKeys.isEmpty) {
      return const EmptyWidget(
        icon: Icons.key_outlined,
        title: 'No API keys',
        subtitle: 'Create an API key to access the API',
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(apiKeysProvider.notifier).load(),
      child: ListView.builder(
        itemCount: state.apiKeys.length,
        itemBuilder: (context, index) {
          final apiKey = state.apiKeys[index];
          return _ApiKeyTile(
            apiKey: apiKey,
            onToggle: (active) => ref.read(apiKeysProvider.notifier).toggleActive(apiKey.id, active),
            onDelete: () => _confirmDelete(context, ref, apiKey),
          );
        },
      ),
    );
  }

  void _showCreateDialog(BuildContext context, WidgetRef ref) {
    final nameController = TextEditingController();
    bool generatePerm = true;
    bool inboxPerm = true;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: const Text('Create API Key'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Name', hintText: 'e.g. My App'),
                ),
                const SizedBox(height: 16),
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Permissions', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
                CheckboxListTile(
                  title: const Text('Generate'),
                  value: generatePerm,
                  onChanged: (v) => setState(() => generatePerm = v ?? false),
                  contentPadding: EdgeInsets.zero,
                ),
                CheckboxListTile(
                  title: const Text('Inbox'),
                  value: inboxPerm,
                  onChanged: (v) => setState(() => inboxPerm = v ?? false),
                  contentPadding: EdgeInsets.zero,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                if (nameController.text.isEmpty) return;
                Navigator.pop(ctx);
                final permissions = <String>[
                  if (generatePerm) 'generate',
                  if (inboxPerm) 'inbox',
                ];
                final fullKey = await ref.read(apiKeysProvider.notifier).create(
                  name: nameController.text.trim(),
                  permissions: permissions,
                );
                if (context.mounted && fullKey != null) {
                  _showKeyDialog(context, fullKey);
                } else if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to create API key')),
                  );
                }
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  void _showKeyDialog(BuildContext context, String key) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('API Key Created'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Copy this key now. It will not be shown again.'),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Expanded(child: SelectableText(key, style: const TextStyle(fontFamily: 'monospace'))),
                  IconButton(
                    icon: const Icon(Icons.copy),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: key));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Copied to clipboard')),
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('Done')),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, WidgetRef ref, ApiKey apiKey) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete API Key'),
        content: Text('Delete "${apiKey.name}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await ref.read(apiKeysProvider.notifier).delete(apiKey.id);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(success ? 'API key deleted' : 'Failed to delete API key'),
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

class _ApiKeyTile extends StatelessWidget {
  final ApiKey apiKey;
  final ValueChanged<bool> onToggle;
  final VoidCallback onDelete;
  const _ApiKeyTile({required this.apiKey, required this.onToggle, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Dismissible(
      key: Key(apiKey.id),
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
        leading: const CircleAvatar(child: Icon(Icons.key)),
        title: Text(apiKey.name),
        subtitle: Text(
          apiKey.permissions.join(', '),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Switch(
          value: apiKey.isActive,
          onChanged: onToggle,
        ),
      ),
    );
  }
}
