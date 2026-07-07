import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { generateIdentity, generateUsername } from "@/lib/llm";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(request: Request) {
  const authResult = await authenticateApiRequest(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  // Check permission
  const perms = JSON.parse(authResult.apiKey!.permissions) as string[];
  if (!perms.includes("generate")) {
    return NextResponse.json({ error: "Kunci API tidak memiliki izin 'generate'" }, { status: 403 });
  }

  try {
    // Get random active domain
    const activeDomains = db
      .select({ id: domains.id, domain: domains.domain })
      .from(domains)
      .where(eq(domains.isActive, true))
      .all();

    if (activeDomains.length === 0) {
      return NextResponse.json({ error: "Tidak ada domain aktif" }, { status: 503 });
    }

    const randomDomain = activeDomains[Math.floor(Math.random() * activeDomains.length)];

    // Generate identity via LLM
    const identity = await generateIdentity();
    const username = generateUsername(identity.firstName, identity.lastName);
    const email = `${username}@${randomDomain.domain}`;

    return NextResponse.json({
      firstName: identity.firstName,
      lastName: identity.lastName,
      username,
      gender: identity.gender,
      dateOfBirth: identity.dateOfBirth,
      email,
      domain: randomDomain.domain,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Gagal generate identitas" },
      { status: 500 }
    );
  }
}
