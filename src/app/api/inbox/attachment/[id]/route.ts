import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attachments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const att = db.select().from(attachments).where(eq(attachments.id, id)).get();

  if (!att) {
    return NextResponse.json({ error: "Lampiran tidak ditemukan" }, { status: 404 });
  }

  try {
    const filePath = path.join(process.cwd(), "data/uploads", att.storagePath);
    const file = await fs.readFile(filePath);

    return new Response(file, {
      headers: {
        "Content-Type": att.mimeType,
        "Content-Disposition": `attachment; filename="${att.filename}"`,
        "Content-Length": att.size.toString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }
}
