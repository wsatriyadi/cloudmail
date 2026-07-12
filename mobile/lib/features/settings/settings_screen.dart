import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/widgets/error_widget.dart';
import '../../core/widgets/loading_widget.dart';
import '../../models/setting.dart';
import 'settings_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  static const _sections = {
    'LLM Configuration': ['llm_api_endpoint', 'llm_api_key', 'llm_model'],
    'SMTP Configuration': ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'],
    'Email Settings': ['email_retention_days'],
    'Webhook': ['webhook_url', 'webhook_secret'],
    'Features': ['auto_label_enabled', 'otp_extraction_enabled'],
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(settingsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: _buildBody(context, ref, state),
    );
  }

  Widget _buildBody(BuildContext context, WidgetRef ref, SettingsState state) {
    if (state.isLoading) return const LoadingWidget(message: 'Loading settings...');
    if (state.error != null) {
      return AppErrorWidget(
        message: state.error!,
        onRetry: () => ref.read(settingsProvider.notifier).load(),
      );
    }

    final settingsMap = {for (final s in state.settings) s.key: s};

    return RefreshIndicator(
      onRefresh: () => ref.read(settingsProvider.notifier).load(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: _sections.entries.map((section) {
          return _SettingsSection(
            title: section.key,
            settings: section.value
                .map((key) => settingsMap[key])
                .whereType<Setting>()
                .toList(),
            onEdit: (setting) => _showEditDialog(context, ref, setting),
          );
        }).toList(),
      ),
    );
  }

  void _showEditDialog(BuildContext context, WidgetRef ref, Setting setting) {
    final controller = TextEditingController(text: setting.value);
    final isSensitive = setting.key.contains('key') ||
        setting.key.contains('pass') ||
        setting.key.contains('secret');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(_formatKey(setting.key)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (setting.description != null) ...[
              Text(setting.description!, style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 12),
            ],
            TextField(
              controller: controller,
              obscureText: isSensitive,
              decoration: InputDecoration(
                labelText: 'Value',
                hintText: setting.key,
              ),
              maxLines: isSensitive ? 1 : 3,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await ref.read(settingsProvider.notifier).updateSetting(
                setting.key,
                controller.text.trim(),
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(success ? 'Setting updated' : 'Failed to update setting'),
                ));
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  String _formatKey(String key) {
    return key
        .split('_')
        .map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '')
        .join(' ');
  }
}

class _SettingsSection extends StatelessWidget {
  final String title;
  final List<Setting> settings;
  final ValueChanged<Setting> onEdit;
  const _SettingsSection({required this.title, required this.settings, required this.onEdit});

  @override
  Widget build(BuildContext context) {
    if (settings.isEmpty) return const SizedBox.shrink();
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(title, style: theme.textTheme.titleSmall?.copyWith(
              color: theme.colorScheme.primary,
            )),
          ),
          ...settings.map((setting) {
            final isSensitive = setting.key.contains('key') ||
                setting.key.contains('pass') ||
                setting.key.contains('secret');
            return ListTile(
              title: Text(_formatKey(setting.key)),
              subtitle: Text(
                isSensitive && setting.value.isNotEmpty
                    ? '••••••••'
                    : setting.value.isEmpty
                        ? '(not set)'
                        : setting.value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              trailing: const Icon(Icons.edit, size: 18),
              onTap: () => onEdit(setting),
            );
          }),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  String _formatKey(String key) {
    return key
        .split('_')
        .map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '')
        .join(' ');
  }
}
