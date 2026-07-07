/**
 * Extract OTP/verification codes from email body text
 * Supports: 4-8 digit codes, alphanumeric codes, verification links
 */
export function extractOTP(text: string | null): string | null {
  if (!text) return null;

  // Common OTP patterns (ordered by specificity)
  const patterns = [
    // "your code is 123456" / "kode verifikasi: 123456"
    /(?:code|kode|otp|pin|token|sandi)\s*(?:is|:|\s)\s*[:\s]*(\d{4,8})\b/i,
    // "verification code: ABC123"
    /(?:verification|verifikasi|confirm)\s*(?:code|kode)\s*[:\s]*([A-Z0-9]{4,8})\b/i,
    // "123456 is your verification code"
    /\b(\d{4,8})\s+(?:is your|adalah)\s+(?:code|kode|otp|verification)/i,
    // "Enter 123456 to verify"
    /(?:enter|masukkan|gunakan|use)\s+(\d{4,8})\s+(?:to|untuk)/i,
    // "one-time password: 123456"
    /(?:one[- ]time\s*(?:password|passcode|code)|otp)\s*[:\s]*(\d{4,8})\b/i,
    // Standalone 6-digit code on its own line (very common pattern)
    /^\s*(\d{6})\s*$/m,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Auto-label email category based on content analysis
 */
export function categorizeEmail(
  subject: string,
  textBody: string | null
): string | null {
  const subjectLower = subject.toLowerCase();
  const bodyLower = (textBody || "").toLowerCase();
  const combined = `${subjectLower} ${bodyLower}`;

  // OTP / Verification
  if (
    /\b(otp|one[- ]time|verification code|kode verifikasi|verify your|konfirmasi|2fa|two[- ]factor)\b/.test(
      combined
    )
  ) {
    return "otp";
  }

  // Account verification / Confirmation
  if (
    /\b(verify your (email|account)|confirm your|activate your|validasi|aktifkan akun)\b/.test(
      combined
    )
  ) {
    return "verification";
  }

  // Password reset
  if (/\b(reset password|forgot password|lupa password|ubah kata sandi|reset your password)\b/.test(combined)) {
    return "password-reset";
  }

  // Newsletter / Marketing
  if (
    /\b(unsubscribe|berhenti berlangganan|newsletter|weekly digest|monthly update|promo|special offer|diskon)\b/.test(
      combined
    )
  ) {
    return "newsletter";
  }

  // Transaction / Order
  if (
    /\b(order confirm|invoice|receipt|payment|transaksi|pembayaran|pesanan|tagihan)\b/.test(
      combined
    )
  ) {
    return "transaction";
  }

  // Notification
  if (
    /\b(notification|notifikasi|alert|pemberitahuan|reminder|pengingat)\b/.test(
      combined
    )
  ) {
    return "notification";
  }

  return null;
}

/**
 * Get label display info
 */
export function getLabelInfo(label: string | null): {
  text: string;
  variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
} {
  switch (label) {
    case "otp":
      return { text: "OTP", variant: "destructive" };
    case "verification":
      return { text: "Verifikasi", variant: "warning" };
    case "password-reset":
      return { text: "Reset Password", variant: "destructive" };
    case "newsletter":
      return { text: "Newsletter", variant: "secondary" };
    case "transaction":
      return { text: "Transaksi", variant: "success" };
    case "notification":
      return { text: "Notifikasi", variant: "outline" };
    default:
      return { text: "Lainnya", variant: "default" };
  }
}
