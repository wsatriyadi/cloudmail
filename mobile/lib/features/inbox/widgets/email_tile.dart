import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../models/email.dart';

class EmailTile extends StatelessWidget {
  final Email email;
  final VoidCallback onTap;
  final VoidCallback? onDismissed;

  const EmailTile({super.key, required this.email, required this.onTap, this.onDismissed});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isUnread = !email.isRead;

    return Dismissible(
      key: Key(email.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: theme.colorScheme.error,
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) => onDismissed?.call(),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: CircleAvatar(
          backgroundColor: isUnread ? theme.colorScheme.primaryContainer : theme.colorScheme.surfaceContainerHighest,
          child: Text(
            email.displayName.isNotEmpty ? email.displayName[0].toUpperCase() : '?',
            style: TextStyle(
              color: isUnread ? theme.colorScheme.onPrimaryContainer : theme.colorScheme.onSurfaceVariant,
              fontWeight: isUnread ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                email.displayName,
                maxLines: 1, overflow: TextOverflow.ellipsis,
                style: TextStyle(fontWeight: isUnread ? FontWeight.w600 : FontWeight.normal),
              ),
            ),
            Text(
              timeago.format(email.receivedAt, locale: 'en_short'),
              style: theme.textTheme.bodySmall?.copyWith(
                color: isUnread ? theme.colorScheme.primary : theme.colorScheme.outline,
              ),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(email.subject, maxLines: 1, overflow: TextOverflow.ellipsis,
              style: TextStyle(fontWeight: isUnread ? FontWeight.w500 : FontWeight.normal)),
            if (email.preview != null)
              Text(email.preview!, maxLines: 1, overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline)),
            if (email.label != null || email.hasAttachments) ...[
              const SizedBox(height: 4),
              Row(children: [
                if (email.label != null) LabelBadge(label: email.label!),
                if (email.hasAttachments) ...[
                  const SizedBox(width: 6),
                  Icon(Icons.attach_file, size: 14, color: theme.colorScheme.outline),
                ],
              ]),
            ],
          ],
        ),
      ),
    );
  }
}

class LabelBadge extends StatelessWidget {
  final String label;
  const LabelBadge({super.key, required this.label});

  @override
  Widget build(BuildContext context) {
    final (color, icon) = switch (label.toLowerCase()) {
      'otp' => (Colors.orange, Icons.pin),
      'verification' => (Colors.blue, Icons.verified),
      'newsletter' => (Colors.green, Icons.newspaper),
      _ => (Colors.grey, Icons.label),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withAlpha(30),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10, color: color),
          const SizedBox(width: 3),
          Text(label.toUpperCase(), style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }
}
