import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/authz";

/**
 * Endpoint cleanup bisa dipanggil oleh cron (header Bearer CRON_SECRET) atau
 * oleh admin yang sedang login. Jika CRON_SECRET belum diatur, hanya admin
 * dengan session valid yang diizinkan.
 */
export async function authorizeCron(
  request: Request
): Promise<NextResponse | null> {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (secret && authHeader === `Bearer ${secret}`) {
    return null;
  }

  const user = await sessionUser();
  if (user?.role === "admin") {
    return null;
  }

  return NextResponse.json(
    {
      error: "Tidak terotorisasi. Gunakan header Authorization: Bearer <CRON_SECRET> atau login sebagai admin.",
    },
    { status: 401 }
  );
}
