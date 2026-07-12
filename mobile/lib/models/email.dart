class Attachment {
  final String id;
  final String filename;
  final String mimeType;
  final int size;

  const Attachment({required this.id, required this.filename, required this.mimeType, required this.size});

  factory Attachment.fromJson(Map<String, dynamic> json) => Attachment(
    id: json['id'] as String,
    filename: json['filename'] as String? ?? 'unknown',
    mimeType: json['mimeType'] as String? ?? 'application/octet-stream',
    size: json['size'] as int? ?? 0,
  );

  Map<String, dynamic> toJson() => {'id': id, 'filename': filename, 'mimeType': mimeType, 'size': size};
}

class Email {
  final String id;
  final String messageId;
  final String from;
  final String? fromName;
  final String to;
  final String subject;
  final String? preview;
  final String? textBody;
  final String? htmlBody;
  final DateTime receivedAt;
  final bool isRead;
  final String? label;
  final String? otpCode;
  final bool hasAttachments;
  final List<Attachment> attachments;

  const Email({
    required this.id,
    required this.messageId,
    required this.from,
    this.fromName,
    required this.to,
    required this.subject,
    this.preview,
    this.textBody,
    this.htmlBody,
    required this.receivedAt,
    required this.isRead,
    this.label,
    this.otpCode,
    required this.hasAttachments,
    this.attachments = const [],
  });

  factory Email.fromJson(Map<String, dynamic> json) => Email(
    id: json['id'] as String,
    messageId: json['messageId'] as String? ?? '',
    from: json['from'] as String? ?? '',
    fromName: json['fromName'] as String?,
    to: json['to'] as String? ?? '',
    subject: json['subject'] as String? ?? '(no subject)',
    preview: json['preview'] as String?,
    textBody: json['textBody'] as String?,
    htmlBody: json['htmlBody'] as String?,
    receivedAt: DateTime.tryParse(json['receivedAt'] as String? ?? '') ?? DateTime.now(),
    isRead: json['isRead'] as bool? ?? false,
    label: json['label'] as String?,
    otpCode: json['otpCode'] as String?,
    hasAttachments: json['hasAttachments'] as bool? ?? false,
    attachments: (json['attachments'] as List<dynamic>?)
        ?.map((e) => Attachment.fromJson(e as Map<String, dynamic>))
        .toList() ?? [],
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'messageId': messageId,
    'from': from,
    'fromName': fromName,
    'to': to,
    'subject': subject,
    'preview': preview,
    'textBody': textBody,
    'htmlBody': htmlBody,
    'receivedAt': receivedAt.toIso8601String(),
    'isRead': isRead,
    'label': label,
    'otpCode': otpCode,
    'hasAttachments': hasAttachments,
    'attachments': attachments.map((a) => a.toJson()).toList(),
  };

  String get displayName => fromName?.isNotEmpty == true ? fromName! : from;
}
