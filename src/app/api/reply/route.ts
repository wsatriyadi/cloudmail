import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { authenticateApiRequest } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { emails, settings } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { addressesOwnedByApiKey } from "@/lib/address-access";

const replySchema = z.object({
  emailId: z.string().optional(),
  from: z.string().email(),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  isHtml: z.boolean().optional().default(false),
});

const SMTP_KEYS = [
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_password",
  "smtp_secure",
  "smtp_from",
] as const;

export async function POST(request: Request) {
  const authResult = await authenticateApiRequest(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = replySchema.parse(body);

    const settingRows = await db
      .select()
      .from(settings)
      .where(inArray(settings.key, [...SMTP_KEYS]));

    const config = Object.fromEntries(
      settingRows.map((row) => [row.key, row.value])
    ) as Record<string, string>;

    if (!config.smtp_host) {
      return NextResponse.json(
        {
          error: "SMTP belum dikonfigurasi. Atur host SMTP di Pengaturan untuk mengirim email.",
          smtpRequired: true,
        },
        { status: 503 }
      );
    }

    let replyContext = null;
    if (parsed.emailId) {
      const originalEmail = (
        await db
          .select({
            fromAddress: emails.fromAddress,
            toAddress: emails.toAddress,
            subject: emails.subject,
            receivedAt: emails.receivedAt,
          })
          .from(emails)
          .where(eq(emails.id, parsed.emailId))
      )[0];

      if (originalEmail) {
        const owned = await addressesOwnedByApiKey(authResult.apiKey!.id);
        if (
          owned !== null &&
          !owned.some(
            (address) =>
              address.toLowerCase() === originalEmail.toAddress.toLowerCase()
          )
        ) {
          return NextResponse.json(
            { error: "Email tidak ditemukan" },
            { status: 404 }
          );
        }

        replyContext = {
          originalFrom: originalEmail.fromAddress,
          originalSubject: originalEmail.subject,
          originalDate: originalEmail.receivedAt,
        };
      }
    }

    const port = Number.parseInt(config.smtp_port || "587", 10);
    const secure =
      config.smtp_secure === "true" || config.smtp_secure === "1" || port === 465;

    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: Number.isFinite(port) ? port : 587,
      secure,
      auth: config.smtp_user
        ? { user: config.smtp_user, pass: config.smtp_password || "" }
        : undefined,
    });

    const info = await transporter.sendMail({
      from: config.smtp_from || config.smtp_user || parsed.from,
      to: parsed.to,
      subject: parsed.subject,
      ...(parsed.isHtml ? { html: parsed.body } : { text: parsed.body }),
      replyTo: parsed.from,
    });

    return NextResponse.json({
      status: "sent",
      message: "Email berhasil dikirim.",
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      replyContext,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("Reply error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Gagal mengirim email: ${err.message}`
            : "Gagal mengirim email",
      },
      { status: 502 }
    );
  }
}
