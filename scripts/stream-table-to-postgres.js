// Stream satu tabel SQLite sebagai TSV ke stdout untuk PostgreSQL COPY.
//
// PENTING: urutan kolom SQLite != urutan kolom PostgreSQL (kolom yang
// ditambahkan lewat ALTER TABLE berada di akhir di SQLite). Jadi COPY harus
// memakai daftar kolom eksplisit, ambil lewat `--columns`.
//
// Pemakaian:
//   node scripts/stream-table-to-postgres.js <table> --columns
//   node scripts/stream-table-to-postgres.js <table> | psql "$DATABASE_URL" -c "COPY t (cols) FROM STDIN (FORMAT text, NULL '\N')"

const Database = require("better-sqlite3");

const SQLITE_PATH = process.env.SQLITE_PATH || "./data/cloudmail.db";
const args = process.argv.slice(2);
const table = args[0];
const wantColumns = args.includes("--columns");

const TIMESTAMP_COLUMNS = {
  users: ["created_at", "updated_at"],
  domains: ["created_at", "updated_at"],
  api_keys: ["last_used_at", "expires_at", "created_at"],
  emails: ["received_at", "created_at"],
  email_bodies: [],
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

// Kolom NOT NULL di PostgreSQL yang pada DB SQLite lama masih bisa NULL.
// Pengganti epoch 0, bukan waktu sekarang, supaya umur data tidak dipalsukan.
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

// Urutan kolom dikunci mengikuti skema PostgreSQL, bukan urutan PRAGMA SQLite.
const COLUMN_ORDER = {
  users: ["id", "email", "password_hash", "name", "role", "created_at", "updated_at"],
  domains: ["id", "domain", "is_active", "cloudflare_zone_id", "description", "created_at", "updated_at"],
  emails: [
    "id", "message_id", "from_address", "from_name", "to_address", "subject", "preview",
    "domain_id", "is_read", "label", "otp_code", "received_at", "created_at",
  ],
  email_bodies: ["email_id", "text_body", "html_body", "raw_headers"],
  attachments: ["id", "email_id", "filename", "mime_type", "size", "storage_path", "created_at"],
  api_keys: [
    "id", "name", "key_hash", "key_prefix", "permissions", "rate_limit", "ip_allowlist",
    "is_active", "last_used_at", "expires_at", "created_by_id", "created_at",
  ],
  rate_limit_entries: ["id", "api_key_id", "window_start", "request_count"],
  aliases: [
    "id", "address", "local_part", "domain_id", "description", "expires_at",
    "is_active", "created_by_id", "api_key_id", "created_at",
  ],
  audit_logs: ["id", "user_id", "action", "resource", "details", "ip_address", "created_at"],
  settings: ["key", "value", "updated_at"],
  nama_depan: ["id", "gender", "nama_depan"],
  nama_belakang: ["id", "gender", "nama_belakang"],
  identitas: [
    "id", "address", "username", "domain_id", "first_name", "last_name", "gender",
    "date_of_birth", "source", "api_key_id", "user_id", "created_at",
  ],
};

// NUL byte tidak sah di text PostgreSQL dan bikin COPY gagal.
function esc(value) {
  if (value === null || value === undefined) return "\\N";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\t/g, "\\t")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\0/g, "");
}

function toTimestamp(value, qualifiedColumn) {
  if (value === null || value === undefined) {
    return NOT_NULL_TIMESTAMPS.has(qualifiedColumn) ? new Date(0).toISOString() : null;
  }
  return new Date(Number(value) * 1000).toISOString();
}

if (!table) {
  console.error("Pemakaian: node scripts/stream-table-to-postgres.js <table> [--columns]");
  process.exit(1);
}

const columns = COLUMN_ORDER[table];
if (!columns) {
  console.error(`Tabel tidak dikenal: ${table}`);
  process.exit(1);
}

if (wantColumns) {
  process.stdout.write(columns.join(","));
  process.exit(0);
}

const db = new Database(SQLITE_PATH, { readonly: true });
const existing = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
const projected = columns.filter((c) => existing.includes(c));

const tsCols = TIMESTAMP_COLUMNS[table] || [];
const boolCols = BOOLEAN_COLUMNS[table] || [];

let buffer = "";
const rows = db.prepare(`SELECT ${projected.join(", ")} FROM ${table}`);
for (const row of rows.iterate()) {
  const fields = projected.map((col) => {
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
