import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../models/email.dart';
import '../../../core/api/api_endpoints.dart';

class AttachmentCard extends StatelessWidget {
  final Attachment attachment;
  const AttachmentCard({super.key, required this.attachment});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: theme.colorScheme.secondaryContainer,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(_iconForMime(attachment.mimeType), color: theme.colorScheme.onSecondaryContainer, size: 20),
        ),
        title: Text(attachment.filename, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text(_formatSize(attachment.size), style: theme.textTheme.bodySmall),
        trailing: IconButton(
          icon: const Icon(Icons.download),
          onPressed: () async {
            final url = Uri.parse('${ApiEndpoints.baseUrl}${ApiEndpoints.attachment(attachment.id)}');
            if (await canLaunchUrl(url)) {
              await launchUrl(url, mode: LaunchMode.externalApplication);
            }
          },
        ),
      ),
    );
  }

  IconData _iconForMime(String mime) => switch (mime) {
    _ when mime.startsWith('image/') => Icons.image,
    _ when mime.startsWith('video/') => Icons.video_file,
    _ when mime.startsWith('audio/') => Icons.audio_file,
    _ when mime.contains('pdf') => Icons.picture_as_pdf,
    _ when mime.contains('zip') || mime.contains('tar') || mime.contains('gz') => Icons.folder_zip,
    _ when mime.contains('text') => Icons.text_snippet,
    _ => Icons.attach_file,
  };

  String _formatSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
