import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { and, desc, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/authz";
import { emailScopeCondition } from "@/lib/address-access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await sessionUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak terotorisasi" }, { status: 401 });
  }

  const url = new URL(request.url);
  const since = url.searchParams.get("since"); // ISO timestamp
  const sinceDate = since ? new Date(since) : null;

  // Batasi stream ke email milik user (admin melihat semua).
  const scope = emailScopeCondition(user.id, user.role);
  const where =
    sinceDate && !Number.isNaN(sinceDate.getTime())
      ? and(scope, gt(emails.receivedAt, sinceDate))
      : scope;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let interval: ReturnType<typeof setInterval> | undefined;

      const close = () => {
        if (closed) return;
        closed = true;
        if (interval) clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Client sudah memutus koneksi.
        }
      };

      const sendEvent = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Controller bisa saja sudah tertutup saat request dibatalkan.
          close();
        }
      };

      // Poll every 3 seconds for new emails
      interval = setInterval(async () => {
        if (closed) return;
        try {
          const results = await db
            .select({
              id: emails.id,
              fromAddress: emails.fromAddress,
              fromName: emails.fromName,
              toAddress: emails.toAddress,
              subject: emails.subject,
              preview: emails.preview,
              label: emails.label,
              otpCode: emails.otpCode,
              receivedAt: emails.receivedAt,
              isRead: emails.isRead,
            })
            .from(emails)
            .where(where)
            .orderBy(desc(emails.receivedAt))
            .limit(20);

          if (results.length > 0) {
            sendEvent({ type: "new_emails", emails: results });
          } else {
            sendEvent({ type: "heartbeat" });
          }
        } catch {
          sendEvent({ type: "heartbeat" });
        }
      }, 3000);

      // Clean up on close
      request.signal.addEventListener("abort", close);

      // Initial data
      sendEvent({ type: "connected" });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
