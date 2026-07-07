import PostalMime from "postal-mime";

interface Env {
  BACKEND_URL: string;
  INGEST_SECRET: string;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    try {
      // Read the raw email
      const rawEmail = await new Response(message.raw).arrayBuffer();

      // Parse with postal-mime
      const parser = new PostalMime();
      const parsed = await parser.parse(rawEmail);

      // Extract preview (first 200 chars of text body)
      const preview = parsed.text
        ? parsed.text.substring(0, 200).replace(/\s+/g, " ").trim()
        : "";

      // Prepare attachments as base64
      const attachments = (parsed.attachments || []).map((att) => ({
        filename: att.filename || "unnamed",
        mimeType: att.mimeType || "application/octet-stream",
        size: att.content.byteLength,
        contentBase64: arrayBufferToBase64(att.content),
      }));

      // Build payload
      const payload = {
        messageId: parsed.messageId || null,
        from: message.from,
        fromName: parsed.from?.name || null,
        to: message.to,
        subject: parsed.subject || "(tanpa subjek)",
        textBody: parsed.text || null,
        htmlBody: parsed.html || null,
        preview,
        headers: Object.fromEntries(
          (parsed.headers || []).map((h) => [h.key, h.value])
        ),
        attachments,
        receivedAt: new Date().toISOString(),
      };

      // Sign the request with HMAC
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify(payload);
      const signature = await hmacSign(body + timestamp, env.INGEST_SECRET);

      // Send to backend
      const response = await fetch(`${env.BACKEND_URL}/api/internal/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Worker-Timestamp": timestamp,
          "X-Worker-Signature": signature,
        },
        body,
      });

      if (!response.ok) {
        console.error(
          `Backend rejected email: ${response.status} ${await response.text()}`
        );
      }
    } catch (error) {
      console.error("Failed to process email:", error);
      // Don't throw — Cloudflare will retry and we'd get duplicates
    }
  },
};

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
