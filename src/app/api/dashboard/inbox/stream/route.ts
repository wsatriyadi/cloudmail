import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const since = url.searchParams.get("since"); // ISO timestamp

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Poll every 3 seconds for new emails
      const interval = setInterval(() => {
        try {
          let query = db
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
            .orderBy(desc(emails.receivedAt))
            .limit(20);

          // If since is provided, only get newer emails
          // Convert ISO string to epoch seconds (SQLite stores receivedAt as epoch int)
          const results = since
            ? query.where(sql`${emails.receivedAt} > ${Math.floor(new Date(since).getTime() / 1000)}`).all()
            : query.all();

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
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });

      // Initial data
      sendEvent({ type: "connected" });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
