import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiRequest } from "@/lib/api-auth";
import { setorNama, setorNamaSchema } from "@/lib/nama";

export async function POST(request: Request) {
  const authResult = await authenticateApiRequest(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const perms = JSON.parse(authResult.apiKey!.permissions) as string[];
  if (!perms.includes("generate")) {
    return NextResponse.json({ error: "Kunci API tidak memiliki izin 'generate'" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON valid" }, { status: 400 });
  }

  try {
    const input = setorNamaSchema.parse(body);
    const result = setorNama(input);
    const added =
      result.nama_depan?.status === "added" || result.nama_belakang?.status === "added";
    return NextResponse.json(result, { status: added ? 201 : 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("Setor nama gagal:", err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
