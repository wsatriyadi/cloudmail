import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emails, attachments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    // Delete attachment files
    const atts = db.select().from(attachments).where(eq(attachments.emailId, id)).all();
    for (const att of atts) {
      const filePath = path.join(process.cwd(), "data/uploads", att.storagePath);
      await fs.unlink(filePath).catch(() => {});
    }

    // Cascade delete handles attachments in DB
    db.delete(emails).where(eq(emails.id, id)).run();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
