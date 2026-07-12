import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/widgets/empty_widget.dart';
import 'generate_provider.dart';
import 'widgets/identity_card.dart';

class GenerateScreen extends ConsumerStatefulWidget {
  const GenerateScreen({super.key});

  @override
  ConsumerState<GenerateScreen> createState() => _GenerateScreenState();
}

class _GenerateScreenState extends ConsumerState<GenerateScreen> {
  final _apiKeyController = TextEditingController();
  bool _showApiKeyField = false;

  @override
  void dispose() {
    _apiKeyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(generateProvider);
    final apiKey = ref.watch(apiKeyProvider);
    final theme = Theme.of(context);

    ref.listen<GenerateState>(generateProvider, (prev, next) {
      if (next.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.error!), behavior: SnackBarBehavior.floating),
        );
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Generate Identity'),
        actions: [
          IconButton(
            icon: Icon(apiKey != null ? Icons.key : Icons.key_off),
            tooltip: 'API Key',
            onPressed: () => setState(() => _showApiKeyField = !_showApiKeyField),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_showApiKeyField || apiKey == null) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('API Key', style: theme.textTheme.titleSmall),
                    const SizedBox(height: 4),
                    Text('Required to generate temporary identities',
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _apiKeyController,
                            decoration: InputDecoration(
                              hintText: apiKey != null ? '••••••${apiKey.substring(apiKey.length > 6 ? apiKey.length - 6 : 0)}' : 'Enter API key',
                              isDense: true,
                            ),
                            obscureText: true,
                          ),
                        ),
                        const SizedBox(width: 8),
                        FilledButton(
                          onPressed: () {
                            if (_apiKeyController.text.isNotEmpty) {
                              ref.read(apiKeyProvider.notifier).setApiKey(_apiKeyController.text.trim());
                              _apiKeyController.clear();
                              setState(() => _showApiKeyField = false);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('API key saved'), behavior: SnackBarBehavior.floating),
                              );
                            }
                          },
                          child: const Text('Save'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
          Center(
            child: FilledButton.icon(
              onPressed: state.isLoading ? null : () => ref.read(generateProvider.notifier).generate(),
              icon: state.isLoading
                  ? const SizedBox(height: 18, width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.auto_awesome),
              label: Text(state.isLoading ? 'Generating...' : 'Generate Identity'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                textStyle: theme.textTheme.titleMedium,
              ),
            ),
          ),
          const SizedBox(height: 24),
          if (state.identity != null) ...[
            Text('Generated Identity', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            IdentityCard(identity: state.identity!),
          ],
          if (state.history.length > 1) ...[
            const SizedBox(height: 24),
            Text('History', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ...state.history.skip(1).map((id) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: IdentityCard(identity: id),
            )),
          ],
          if (state.identity == null && state.history.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 48),
              child: EmptyWidget(
                icon: Icons.auto_awesome,
                title: 'No identities generated',
                subtitle: 'Tap the button above to generate a temporary email identity',
              ),
            ),
        ],
      ),
    );
  }
}
