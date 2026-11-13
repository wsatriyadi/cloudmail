import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { runEmailCleanup } from "@/lib/cleanup";

export const dynamic = "force-dynamic";

/**
 * Cleanup email berdasarkan settings.email_retention_days (satu sumber dengan
 * endpoint internal/cron/cleanup). Butuh CRON_SECRET atau session admin.
 */
async function handle(request: Request) {
  const denied = await authorizeCron(request);
  if (denied) return denied;

  try {
    const result = await runEmailCleanup();
    return NextResponse.json({
      success: true,
      deletedCount: result.deleted,
      retentionDays: result.retentionDays,
      cutoffDate: result.cutoffDate,
      message: result.message,
    });
  } catch (error) {
    console.error("Email cleanup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  return handle(request);
}

// GET/POST untuk manual trigger (cron atau admin yang login).
export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
