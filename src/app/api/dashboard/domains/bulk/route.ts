import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { z } from "zod";

const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const bulkSchema = z.object({
  domains: z.string().min(1, "Daftar domain kosong"),
  description: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
});

interface SkippedDomain {
  domain: string;
  reason: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bulkSchema.parse(body);

    // Pecah per baris, rapikan, buang duplikat dalam input
    const rawLines = parsed.domains
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line.length > 0);

    if (rawLines.length === 0) {
      return NextResponse.json({ error: "Tidak ada domain yang valid" }, { status: 400 });
    }

    // Domain yang sudah ada di DB
    const existingRows = db.select({ domain: domains.domain }).from(domains).all();
    const existingSet = new Set(existingRows.map((r) => r.domain.toLowerCase()));

    const added: string[] = [];
    const skipped: SkippedDomain[] = [];
    const seenInBatch = new Set<string>();
    const toInsert: { id: string; domain: string; description: string | null; isActive: boolean }[] = [];

    for (const domain of rawLines) {
      if (seenInBatch.has(domain)) {
        skipped.push({ domain, reason: "Duplikat dalam daftar" });
        continue;
      }
      seenInBatch.add(domain);

      if (!DOMAIN_REGEX.test(domain)) {
        skipped.push({ domain, reason: "Format tidak valid" });
        continue;
      }

      if (existingSet.has(domain)) {
        skipped.push({ domain, reason: "Sudah terdaftar" });
        continue;
      }

      toInsert.push({
        id: nanoid(),
        domain,
        description: parsed.description || null,
        isActive: parsed.isActive,
      });
      added.push(domain);
    }

    if (toInsert.length > 0) {
      db.insert(domains).values(toInsert).run();
    }

    return NextResponse.json({
      added,
      skipped,
      addedCount: added.length,
      skippedCount: skipped.length,
      total: rawLines.length,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
