import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { lt } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Cleanup old emails (90-day retention)
 * DELETE /api/cron/cleanup-emails
 * 
 * Run this daily via cron or PM2 scheduled job
 */
export async function DELETE() {
  try {
    // Calculate 90 days ago timestamp
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Delete emails older than 90 days
    const result = db
      .delete(emails)
      .where(lt(emails.receivedAt, ninetyDaysAgo))
      .run();

    return NextResponse.json({
      success: true,
      deletedCount: result.changes,
      cutoffDate: ninetyDaysAgo.toISOString(),
      message: `Deleted ${result.changes} emails older than 90 days`,
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

// Also support GET for manual trigger from browser
export async function GET() {
  return DELETE();
}
