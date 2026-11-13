import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL wajib diisi (PostgreSQL connection string). " +
      "CloudMail hanya mendukung PostgreSQL; isi DATABASE_URL sebelum menjalankan aplikasi."
  );
}

// max kecil: aplikasi ini jalan sebagai satu proses Next.js; pool besar hanya
// menambah koneksi terbuang di managed Postgres.
export const sql = postgres(connectionString, { max: 10 });
export const db = drizzle(sql, { schema });
