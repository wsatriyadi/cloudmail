import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { emails, settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const replySchema = z.object({
  emailId: z.string().optional(),
  from: z.string().email(),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  isHtml: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const authResult = await authenticateApiRequest(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = replySchema.parse(body);

    const smtpHost = db.select().from(settings).where(eq(settings.key, "smtp_host")).get();
    const smtpPort = db.select().from(settings).where(eq(settings.key, "smtp_port")).get();
    const smtpUser = db.select().from(settings).where(eq(settings.key, "smtp_user")).get();

    if (!smtpHost?.value) {
      return NextResponse.json({
        error: "SMTP belum dikonfigurasi. Atur di Pengaturan untuk mengirim email.",
        smtpRequired: true,
      }, { status: 503 });
    }

    let replyContext = null;
    if (parsed.emailId) {
      const originalEmail = db.select().from(emails).where(eq(emails.id, parsed.emailId)).get();
      if (originalEmail) {
        replyContext = {
          originalFrom: originalEmail.fromAddress,
          originalSubject: originalEmail.subject,
          originalDate: originalEmail.receivedAt,
        };
      }
    }

    return NextResponse.json({
      status: "prepared",
      message: "Email siap dikirim. Konfigurasi SMTP diperlukan untuk pengiriman aktual.",
      data: {
        from: parsed.from,
        to: parsed.to,
        subject: parsed.subject,
        body: parsed.body,
        isHtml: parsed.isHtml,
        replyContext,
        smtp: {
          host: smtpHost.value,
          port: parseInt(smtpPort?.value || "587"),
          user: smtpUser?.value || "",
        },
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
