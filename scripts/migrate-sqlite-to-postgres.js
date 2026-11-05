// Copy data dari SQLite (lama) ke PostgreSQL (baru).
//
// Prasyarat:
//   1. Skema PostgreSQL sudah dibuat: DATABASE_URL=... npx drizzle-kit push
//   2. Ingest dihentikan supaya tidak ada penulisan baru saat copy.
//
// Urutan tabel mengikuti foreign key: parent dulu, baru child.
// Kolom timestamp disimpan sebagai epoch detik di SQLite dan bigint di Postgres
// (skema drizzle memakai timestamp with time zone), jadi konversi pakai
// to_timestamp(); nilai null dibiarkan null.

const fs = require("fs");

const SQLITE_PATH = process.env.SQLITE_PATH || "./data/cloudmail.db";
const BATCH = Number(process.env.BATCH || 2000);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL (PostgreSQL) wajib diisi");
  process.exit(1);
}

const TABLES = [
  "users",
  "domains",
  "api_keys",
  "emails",
  "email_bodies",
  "attachments",
  "rate_limit_entries",
  "aliases",
  "audit_logs",
  "settings",
  "nama_depan",
  "nama_belakang",
  "identitas",
];

// Kolom epoch (detik) → timestamptz.
const TIMESTAMP_COLUMNS = {
  users: ["created_at", "updated_at"],
  domains: ["created_at", "updated_at"],
  api_keys: ["last_used_at", "expires_at", "created_at"],
  emails: ["received_at", "created_at"],
  attachments: ["created_at"],
  aliases: ["expires_at", "created_at"],
  audit_logs: ["created_at"],
  settings: ["updated_at"],
  identitas: ["created_at"],
};

// Kolom integer 0/1 → boolean.
const BOOLEAN_COLUMNS = {
  domains: ["is_active"],
  emails: ["is_read"],
  attachments: [],
  api_keys: ["is_active"],
  aliases: ["is_active"],
};

// Kolom serial: PostgreSQL mengisi nilai, tapi id lama perlu dipertahankan
// supaya referensi tetap cocok, jadi ikut dicopy eksplisit.
const SERIAL_TABLES = ["rate_limit_entries", "audit_logs", "nama_depan", "nama_belakang"];

function loadPostgres() {
  const postgres = require("postgres");
  return postgres(process.env.DATABASE_URL, { max: 4 });
}

async function resetSequences(sqlClient) {
  for (const table of SERIAL_TABLES) {
    await sqlClient.unsafe(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'),
         COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`
    );
  }
}

async function main() {
  if (!fs.existsSync(SQLITE_PATH)) {
    console.error(`SQLite DB tidak ditemukan: ${SQLITE_PATH}`);
    process.exit(1);
  }

  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const pg = loadPostgres();

  const counts = {};
  for (const table of TABLES) {
    counts[table] = sqlite.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
  }
  console.log("Row counts (SQLite):", JSON.stringify(counts));

  for (const table of TABLES) {
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
    if (rows.length === 0) {
      console.log(`- ${table}: kosong`);
      continue;
    }

    const columns = Object.keys(rows[0]);
    const tsCols = TIMESTAMP_COLUMNS[table] || [];
    const boolCols = BOOLEAN_COLUMNS[table] || [];

    let copied = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      // Build multi-row INSERT; nilai dikirim sebagai parameter terpisah.
      const placeholders = [];
      const values = [];
      for (const row of chunk) {
        const rowPlaceholders = columns.map((col) => {
          let value = row[col];
          if (tsCols.includes(col)) {
            values.push(value == null ? null : new Date(value * 1000));
            return `$${values.length}::timestamptz`;
          }
          if (boolCols.includes(col)) {
            values.push(value == null ? null : value === 1 || value === true);
            return `$${values.length}::boolean`;
          }
          values.push(value === undefined ? null : value);
          return `$${values.length}`;
        });
        placeholders.push(`(${rowPlaceholders.join(", ")})`);
      }

      await pg.unsafe(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders.join(", ")}
         ON CONFLICT DO NOTHING`,
        values
      );
      copied += chunk.length;
    }
    console.log(`+ ${table}: ${copied} rows`);
  }

  await resetSequences(pg);
  await pg.end();
  sqlite.close();
  console.log("Selesai. Verifikasi count di PostgreSQL sebelum cutover.");
}

main().catch((err) => {
  console.error("Migrasi gagal:", err);
  process.exit(1);
});
