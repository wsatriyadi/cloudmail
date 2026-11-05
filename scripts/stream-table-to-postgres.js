// Stream satu tabel SQLite sebagai TSV ke stdout untuk PostgreSQL COPY.
// Menghindari file perantara: body email rata-rata puluhan KB, jadi dump 11 GB
// tidak perlu menyentuh disk.
//
// Pemakaian:
//   node scripts/stream-table-to-postgres.js <table> | psql "$DATABASE_URL" -c "COPY <table> FROM STDIN (FORMAT text, NULL '\N')"

const Database = require("better-sqlite3");

const SQLITE_PATH = process.env.SQLITE_PATH || "./data/cloudmail.db";
const table = process.argv[2];

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

const BOOLEAN_COLUMNS = {
  domains: ["is_active"],
  emails: ["is_read"],
  api_keys: ["is_active"],
  aliases: ["is_active"],
};

// Kolom NOT NULL di PostgreSQL yang pada database SQLite lama masih bisa NULL
// (kolom ditambahkan lewat ALTER TABLE setelah baris lama ada). Nilai pengganti
// epoch 0, bukan waktu sekarang, supaya umur data tidak dipalsukan.
const NOT_NULL_TIMESTAMPS = new Set([
  "users.created_at", "users.updated_at",
  "domains.created_at", "domains.updated_at",
  "api_keys.created_at",
  "emails.received_at", "emails.created_at",
  "attachments.created_at",
  "aliases.created_at",
  "audit_logs.created_at",
  "settings.updated_at",
  "identitas.created_at",
]);

function esc(value) {
  if (value === null || value === undefined) return "\\N";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\t/g, "\\t")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

function toTimestamp(value, qualifiedColumn) {
  if (value === null || value === undefined) {
    return NOT_NULL_TIMESTAMPS.has(qualifiedColumn) ? new Date(0).toISOString() : null;
  }
  return new Date(Number(value) * 1000).toISOString();
}

if (!table) {
  console.error("Pemakaian: node scripts/stream-table-to-postgres.js <table>");
  process.exit(1);
}

const db = new Database(SQLITE_PATH, { readonly: true });
const exists = db
  .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
  .get(table);
if (!exists) {
  console.error(`Tabel tidak ada di SQLite: ${table}`);
  process.exit(1);
}

const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
const tsCols = TIMESTAMP_COLUMNS[table] || [];
const boolCols = BOOLEAN_COLUMNS[table] || [];

let buffer = "";
for (const row of db.prepare(`SELECT * FROM ${table}`).iterate()) {
  const fields = columns.map((col) => {
    const raw = row[col];
    if (tsCols.includes(col)) return esc(toTimestamp(raw, `${table}.${col}`));
    if (boolCols.includes(col)) {
      return raw === null || raw === undefined ? "\\N" : raw ? "true" : "false";
    }
    return esc(raw);
  });
  buffer += fields.join("\t") + "\n";
  if (buffer.length >= 1 << 20) {
    process.stdout.write(buffer);
    buffer = "";
  }
}
if (buffer) process.stdout.write(buffer);
db.close();
