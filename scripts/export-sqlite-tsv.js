// Ekspor data dari SQLite ke file TSV siap COPY untuk PostgreSQL.
//
// Konversi nilai:
//   - kolom waktu: epoch detik (SQLite) -> ISO timestamptz
//   - kolom boolean: 0/1 -> true/false
// Escaping format text PostgreSQL: backslash, tab, newline, CR; NULL = \N.
//
// Pemakaian: node scripts/export-sqlite-tsv.js <outDir>

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const SQLITE_PATH = process.env.SQLITE_PATH || "./data/cloudmail.db";
const OUT_DIR = process.argv[2] || "/tmp/cloudmail-pg";

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

function esc(value) {
  if (value === null || value === undefined) return "\\N";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\t/g, "\\t")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

function toTimestamp(epochSeconds) {
  if (epochSeconds === null || epochSeconds === undefined) return null;
  return new Date(Number(epochSeconds) * 1000).toISOString();
}

function main() {
  if (!fs.existsSync(SQLITE_PATH)) {
    console.error(`SQLite DB tidak ditemukan: ${SQLITE_PATH}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const db = new Database(SQLITE_PATH, { readonly: true });
  const counts = {};

  for (const table of TABLES) {
    const exists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(table);
    if (!exists) {
      console.log(`- ${table}: tidak ada, dilewati`);
      counts[table] = 0;
      continue;
    }

    const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    const tsCols = TIMESTAMP_COLUMNS[table] || [];
    const boolCols = BOOLEAN_COLUMNS[table] || [];
    const outPath = path.join(OUT_DIR, `${table}.tsv`);

    // Tulis sinkron: DB bisa puluhan GB, tetapi kecepatan lebih penting
    // daripada kompleksitas aliran asinkron di skrip sekali pakai ini.
    const fd = fs.openSync(outPath, "w");
    let buffer = "";
    let count = 0;

    for (const row of db.prepare(`SELECT * FROM ${table}`).iterate()) {
      const fields = columns.map((col) => {
        const raw = row[col];
        if (tsCols.includes(col)) return esc(toTimestamp(raw));
        if (boolCols.includes(col)) {
          return raw === null || raw === undefined ? "\\N" : raw ? "true" : "false";
        }
        return esc(raw);
      });
      buffer += fields.join("\t") + "\n";
      count++;
      if (buffer.length >= 4 << 20) {
        fs.writeSync(fd, buffer);
        buffer = "";
      }
    }
    if (buffer) fs.writeSync(fd, buffer);
    fs.closeSync(fd);

    counts[table] = count;
    console.log(`+ ${table}: ${count} baris -> ${outPath}`);
  }

  db.close();
  fs.writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify({ counts }, null, 2)
  );
  console.log("Manifest:", path.join(OUT_DIR, "manifest.json"));
}

main();
