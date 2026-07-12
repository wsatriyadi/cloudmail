import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class OtpBanner extends StatelessWidget {
  final String otpCode;
  const OtpBanner({super.key, required this.otpCode});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.orange.withAlpha(30),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.orange.withAlpha(80)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.orange.withAlpha(50),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.pin, color: Colors.orange, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('OTP Code Detected', style: theme.textTheme.labelMedium?.copyWith(color: Colors.orange)),
                const SizedBox(height: 2),
                Text(otpCode, style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold, letterSpacing: 4)),
              ],
            ),
          ),
          IconButton.filled(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: otpCode));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('OTP copied!'), behavior: SnackBarBehavior.floating, duration: Duration(seconds: 1)),
              );
            },
            icon: const Icon(Icons.copy, size: 20),
          ),
        ],
      ),
    );
  }
}
