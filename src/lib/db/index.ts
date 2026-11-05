import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL wajib diisi (PostgreSQL connection string). " +
      "Ganti DATABASE_PATH SQLite dengan DATABASE_URL sebelum menjalankan aplikasi."
  );
}

// max kecil: aplikasi ini jalan sebagai satu proses Next.js; pool besar hanya
// menambah koneksi terbuang di managed Postgres.
export const sql = postgres(connectionString, { max: 10 });
export const db = drizzle(sql, { schema });
