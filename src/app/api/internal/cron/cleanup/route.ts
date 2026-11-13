import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { runEmailCleanup } from "@/lib/cleanup";

export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const denied = await authorizeCron(request);
  if (denied) return denied;

  try {
    const result = await runEmailCleanup();
    return NextResponse.json({
      deleted: result.deleted,
      retentionDays: result.retentionDays,
      message: result.message,
    });
  } catch (err) {
    console.error("Cleanup error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
