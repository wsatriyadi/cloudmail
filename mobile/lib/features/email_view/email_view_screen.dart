import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_widget_from_html_core/flutter_widget_from_html_core.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/widgets/loading_widget.dart';
import '../../core/widgets/error_widget.dart';
import '../../models/email.dart';
import 'widgets/otp_banner.dart';
import 'widgets/attachment_card.dart';

final emailDetailProvider = FutureProvider.autoDispose.family<Email, String>((ref, id) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get(ApiEndpoints.emailById(id));
  if (response.statusCode == 200) {
    return Email.fromJson(response.data as Map<String, dynamic>);
  }
  throw DioException(requestOptions: response.requestOptions, message: 'Failed to load email');
});

class EmailViewScreen extends ConsumerWidget {
  final String emailId;
  const EmailViewScreen({super.key, required this.emailId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final emailAsync = ref.watch(emailDetailProvider(emailId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        actions: [
          emailAsync.whenOrNull(
            data: (email) => IconButton(
              icon: const Icon(Icons.share),
              onPressed: () async {
                final text = 'From: ${email.from}\nSubject: ${email.subject}\n\n${email.textBody ?? email.preview ?? ''}';
                // Use share_plus to share text
                // ignore: deprecated_member_use
                await Share.share(text, subject: email.subject);
              },
            ),
          ) ?? const SizedBox.shrink(),
        ],
      ),
      body: emailAsync.when(
        loading: () => const LoadingWidget(message: 'Loading email...'),
        error: (err, _) => AppErrorWidget(
          message: err.toString(),
          onRetry: () => ref.invalidate(emailDetailProvider(emailId)),
        ),
        data: (email) => SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (email.otpCode != null) OtpBanner(otpCode: email.otpCode!),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(email.subject, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: theme.colorScheme.primaryContainer,
                          child: Text(email.displayName[0].toUpperCase(),
                            style: TextStyle(color: theme.colorScheme.onPrimaryContainer)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(email.displayName, style: theme.textTheme.titleSmall),
                              Text(email.from, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline)),
                            ],
                          ),
                        ),
                        Text(
                          DateFormat.yMMMd().add_jm().format(email.receivedAt),
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('To: ${email.to}', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline)),
                  ],
                ),
              ),
              const Divider(),
              if (email.htmlBody != null && email.htmlBody!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: HtmlWidget(
                    email.htmlBody!,
                    onTapUrl: (url) async {
                      final uri = Uri.tryParse(url);
                      if (uri != null && await canLaunchUrl(uri)) {
                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                      }
                      return true;
                    },
                  ),
                )
              else if (email.textBody != null)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: SelectableText(email.textBody!, style: theme.textTheme.bodyMedium),
                ),
              if (email.attachments.isNotEmpty) ...[
                const Divider(),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Text('Attachments (${email.attachments.length})',
                    style: theme.textTheme.titleSmall),
                ),
                ...email.attachments.map((a) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                  child: AttachmentCard(attachment: a),
                )),
                const SizedBox(height: 16),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
