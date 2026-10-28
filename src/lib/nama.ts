import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { namaDepan, namaBelakang } from "@/lib/db/schema";
import { randomDateOfBirth } from "@/lib/llm";

const NAMA_MAX = 100;

const namaField = z
  .string({ invalid_type_error: "Nama harus berupa teks" })
  .transform((v) => v.trim().replace(/\s+/g, " "))
  .pipe(z.string().min(1, "Nama tidak boleh kosong").max(NAMA_MAX, `Nama maksimal ${NAMA_MAX} karakter`));

export const setorNamaSchema = z
  .object({
    gender: z.preprocess(
      (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
      z.enum(["male", "female"], { errorMap: () => ({ message: "gender harus 'male' atau 'female'" }) })
    ),
    nama_depan: namaField.optional(),
    nama_belakang: namaField.optional(),
  })
  .refine((v) => v.nama_depan !== undefined || v.nama_belakang !== undefined, {
    message: "Isi minimal salah satu: nama_depan atau nama_belakang",
  });

export type SetorNamaInput = z.infer<typeof setorNamaSchema>;
type SetorStatus = { value: string; status: "added" | "duplicate" };

export function setorNama(input: SetorNamaInput) {
  return db.transaction((tx) => {
    let depan: SetorStatus | undefined;
    let belakang: SetorStatus | undefined;

    if (input.nama_depan !== undefined) {
      const res = tx
        .insert(namaDepan)
        .values({ gender: input.gender, namaDepan: input.nama_depan })
        .onConflictDoNothing()
        .run();
      depan = { value: input.nama_depan, status: res.changes > 0 ? "added" : "duplicate" };
    }

    if (input.nama_belakang !== undefined) {
      const res = tx
        .insert(namaBelakang)
        .values({ gender: input.gender, namaBelakang: input.nama_belakang })
        .onConflictDoNothing()
        .run();
      belakang = { value: input.nama_belakang, status: res.changes > 0 ? "added" : "duplicate" };
    }

    return { gender: input.gender, nama_depan: depan, nama_belakang: belakang };
  });
}

// Nama depan hanya diambil dari gender yang punya nama belakang, sehingga
// pasangan sesama gender selalu tersedia jika koleksi tidak kosong.
export function pickIdentityFromCollection() {
  const depan = db
    .select({ gender: namaDepan.gender, nama: namaDepan.namaDepan })
    .from(namaDepan)
    .where(sql`${namaDepan.gender} IN (SELECT DISTINCT gender FROM nama_belakang)`)
    .orderBy(sql`RANDOM()`)
    .limit(1)
    .get();
  if (!depan) return null;

  const belakang = db
    .select({ nama: namaBelakang.namaBelakang })
    .from(namaBelakang)
    .where(sql`${namaBelakang.gender} = ${depan.gender}`)
    .orderBy(sql`RANDOM()`)
    .limit(1)
    .get();
  if (!belakang) return null;

  return {
    firstName: depan.nama,
    lastName: belakang.nama,
    gender: depan.gender,
    dateOfBirth: randomDateOfBirth(),
  };
}
