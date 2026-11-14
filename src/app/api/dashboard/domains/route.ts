import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { canManageDomains, sessionUser } from "@/lib/authz";
import { logAudit, getClientIP } from "@/lib/audit";

const domainSchema = z.object({
  domain: z.string().min(1).regex(/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Format domain tidak valid"),
  description: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
});

const statusSchema = z.enum(["pending", "approved", "rejected"]);

async function requireAdminResponse() {
  const user = await sessionUser();
  if (!user) return { denied: NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 }) };
  if (!canManageDomains(user.role)) {
    return { denied: NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 }) };
  }
  return { user };
}

export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "pelanggan") {
    return NextResponse.json({ error: "Hanya admin atau pelanggan yang dapat menambahkan domain" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = domainSchema.parse(body);

    const existing = (await db.select().from(domains).where(eq(domains.domain, parsed.domain)))[0];
    if (existing) {
      return NextResponse.json({ error: "Domain sudah terdaftar" }, { status: 409 });
    }

    // Domain dari pelanggan belum boleh dipakai sampai disetujui admin.
    const isAdmin = user.role === "admin";
    const id = nanoid();
    await db.insert(domains)
      .values({
        id,
        domain: parsed.domain,
        description: parsed.description || null,
        isActive: isAdmin ? parsed.isActive : false,
        status: isAdmin ? "approved" : "pending",
        createdById: isAdmin ? null : user.id,
      });

    await logAudit({
      userId: user.id,
      action: isAdmin ? "create_domain" : "request_domain",
      resource: `domain:${id}`,
      details: { domain: parsed.domain, status: isAdmin ? "approved" : "pending" },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({
      id,
      domain: parsed.domain,
      status: isAdmin ? "approved" : "pending",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { denied } = await requireAdminResponse();
  if (denied) return denied;
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    const parsed = domainSchema.parse(data);

    const existing = (await db.select().from(domains).where(eq(domains.domain, parsed.domain)))[0];
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Domain sudah digunakan" }, { status: 409 });
    }

    await db.update(domains)
      .set({
        domain: parsed.domain,
        description: parsed.description || null,
        isActive: parsed.isActive,
        updatedAt: new Date(),
      })
      .where(eq(domains.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { denied, user } = await requireAdminResponse();
  if (denied) return denied;
  try {
    const body = await request.json();
    const { id, isActive, status } = body;
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    const updates: Partial<typeof domains.$inferInsert> = { updatedAt: new Date() };
    if (status !== undefined) {
      const parsedStatus = statusSchema.parse(status);
      updates.status = parsedStatus;
      // Approve langsung mengaktifkan; reject/nonaktifkan mematikan domain.
      updates.isActive = parsedStatus === "approved";
    } else if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    } else {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
    }

    await db.update(domains).set(updates).where(eq(domains.id, id));

    if (status !== undefined) {
      await logAudit({
        userId: user!.id,
        action: status === "approved" ? "approve_domain" : "reject_domain",
        resource: `domain:${id}`,
        details: { status },
        ipAddress: getClientIP(request),
      });
    }

    return NextResponse.json({ success: true, status: updates.status, isActive: updates.isActive });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { denied } = await requireAdminResponse();
  if (denied) return denied;
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    await db.delete(domains).where(eq(domains.id, id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
