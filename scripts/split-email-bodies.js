// Pindahkan text_body / html_body / raw_headers dari `emails` ke `email_bodies`.
//
//   node scripts/split-email-bodies.js            # backfill bertahap, aman saat aplikasi jalan
//   node scripts/split-email-bodies.js --finalize # tulis ulang `emails` tanpa kolom body
//
// Backfill memproses per batch dalam transaksi pendek (dibatasi waktu, bukan jumlah
// baris), lalu memberi jeda sebanding supaya ingest dan API tidak menunggu kunci
// tulis melebihi busy_timeout aplikasi. Bisa dihentikan dan dijalankan ulang kapan saja.
//
// --finalize membangun ulang tabel `emails` (perlu aplikasi dihentikan) lalu VACUUM
// supaya ruang body lama dilepas. Jalankan hanya setelah kode v2 (tanpa kolom body)
// siap di-deploy.

const Database = require("better-sqlite3");

const dbPath = process.env.DATABASE_PATH || "/app/data/cloudmail.db";
const BATCH_MAX = Number(process.env.BATCH || 200);
// Satu transaksi tulis tidak boleh lebih lama dari ini (aplikasi menunggu kunci maks 5 dtk).
const TX_BUDGET_MS = Number(process.env.TX_BUDGET_MS || 300);
// Jeda minimal antar batch, dan paling tidak sama dengan lama transaksi barusan.
const PAUSE_MS = Number(process.env.PAUSE_MS || 100);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 30000");

function columns(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function backfill() {
  if (!columns("emails").includes("html_body")) {
    console.log("Kolom body sudah tidak ada di `emails`; tidak ada yang perlu dipindah.");
    return;
  }

  const total = db.prepare("SELECT max(rowid) AS m FROM emails").get().m ?? 0;
  const pick = db.prepare(
    `SELECT rowid AS r, id FROM emails
     WHERE rowid > ? AND id NOT IN (SELECT email_id FROM email_bodies)
     ORDER BY rowid LIMIT ?`
  );
  const copy = db.prepare(
    `INSERT OR IGNORE INTO email_bodies (email_id, text_body, html_body, raw_headers)
     SELECT id, text_body, html_body, raw_headers FROM emails WHERE id = ?`
  );
  const clear = db.prepare(
    "UPDATE emails SET text_body = NULL, html_body = NULL, raw_headers = NULL WHERE id = ?"
  );
  // Salin per baris sampai anggaran waktu habis; sisanya di batch berikutnya.
  const moveBatch = db.transaction((ids) => {
    const started = Date.now();
    let n = 0;
    for (const id of ids) {
      copy.run(id);
      clear.run(id);
      n++;
      if (Date.now() - started >= TX_BUDGET_MS) break;
    }
    return n;
  });

  let cursor = 0;
  let moved = 0;
  const started = Date.now();
  let reported = 0;
  for (;;) {
    const rows = pick.all(cursor, BATCH_MAX);
    if (rows.length === 0) break;
    const txStart = Date.now();
    const n = moveBatch(rows.map((r) => r.id));
    const txMs = Date.now() - txStart;
    moved += n;
    cursor = rows[n - 1].r;
    if (moved - reported >= 2500) {
      reported = moved;
      const pct = total ? ((cursor / total) * 100).toFixed(1) : "100";
      const mins = ((Date.now() - started) / 60000).toFixed(1);
      console.log(`${moved} email dipindah, rowid ${cursor}/${total} (${pct}%), ${mins} menit`);
    }
    sleep(Math.max(PAUSE_MS, txMs));
  }
  console.log(`Backfill selesai: ${moved} email dipindah.`);
}

function finalize() {
  if (!columns("emails").includes("html_body")) {
    console.log("Tabel `emails` sudah tanpa kolom body.");
    return;
  }
  const leftover = db
    .prepare(
      `SELECT count(*) AS c FROM emails
       WHERE (text_body IS NOT NULL OR html_body IS NOT NULL OR raw_headers IS NOT NULL)`
    )
    .get().c;
  if (leftover > 0) {
    throw new Error(`${leftover} email masih menyimpan body di \`emails\`. Jalankan backfill dulu.`);
  }

  console.log("Membangun ulang tabel `emails` tanpa kolom body...");
  db.pragma("foreign_keys = OFF");
  db.exec(`
    BEGIN IMMEDIATE;
    CREATE TABLE emails_new (
      id TEXT PRIMARY KEY,
      message_id TEXT,
      from_address TEXT NOT NULL,
      from_name TEXT,
      to_address TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '(tanpa subjek)',
      preview TEXT,
      domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
      is_read INTEGER NOT NULL DEFAULT 0,
      label TEXT,
      otp_code TEXT,
      received_at INTEGER NOT NULL DEFAULT (unixepoch()),
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    INSERT INTO emails_new
      SELECT id, message_id, from_address, from_name, to_address, subject, preview,
             domain_id, is_read, label, otp_code, received_at, created_at
      FROM emails;
    DROP TABLE emails;
    ALTER TABLE emails_new RENAME TO emails;
    CREATE INDEX idx_emails_to_address ON emails(to_address);
    CREATE INDEX idx_emails_domain_id ON emails(domain_id);
    CREATE INDEX idx_emails_received_at ON emails(received_at);
    CREATE INDEX idx_emails_from_address ON emails(from_address);
    CREATE INDEX idx_emails_message_id ON emails(message_id);
    CREATE INDEX idx_emails_is_read ON emails(is_read);
    COMMIT;
  `);
  db.pragma("foreign_keys = ON");
  const fk = db.pragma("foreign_key_check");
  if (fk.length > 0) throw new Error(`foreign_key_check gagal: ${JSON.stringify(fk.slice(0, 5))}`);

  console.log("VACUUM untuk melepas ruang body lama (butuh ruang disk sementara seukuran DB baru)...");
  const t = Date.now();
  db.exec("VACUUM");
  console.log(`Finalize selesai dalam ${Math.round((Date.now() - t) / 1000)} detik.`);
}

if (process.argv.includes("--finalize")) finalize();
else backfill();
db.close();
