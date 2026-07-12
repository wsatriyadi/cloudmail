import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../models/identity.dart';

class IdentityCard extends StatelessWidget {
  final GeneratedIdentity identity;
  const IdentityCard({super.key, required this.identity});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: theme.colorScheme.primaryContainer,
                  radius: 24,
                  child: Text(identity.firstName.isNotEmpty ? identity.firstName[0] : '?',
                    style: TextStyle(fontSize: 20, color: theme.colorScheme.onPrimaryContainer)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(identity.fullName, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                      Text('@${identity.username}', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _InfoRow(icon: Icons.email, label: 'Email', value: identity.email, copyable: true),
            _InfoRow(icon: Icons.dns, label: 'Domain', value: identity.domain),
            _InfoRow(icon: Icons.person, label: 'Gender', value: identity.gender),
            _InfoRow(icon: Icons.cake, label: 'Birthday', value: identity.dateOfBirth),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool copyable;
  const _InfoRow({required this.icon, required this.label, required this.value, this.copyable = false});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: theme.colorScheme.outline),
          const SizedBox(width: 8),
          Text('$label: ', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline)),
          Expanded(child: Text(value, style: theme.textTheme.bodyMedium)),
          if (copyable)
            IconButton(
              icon: const Icon(Icons.copy, size: 16),
              onPressed: () {
                Clipboard.setData(ClipboardData(text: value));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Copied!'), behavior: SnackBarBehavior.floating, duration: Duration(seconds: 1)),
                );
              },
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              padding: EdgeInsets.zero,
            ),
        ],
      ),
    );
  }
}
