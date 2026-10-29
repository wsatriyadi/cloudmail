// Hapus email yang melewati `email_retention_days` (0 = simpan selamanya).
//
//   node scripts/prune-emails.js            # hapus per batch kecil (aman saat aplikasi jalan)
//   node scripts/prune-emails.js --vacuum   # opsional: VACUUM setelahnya (butuh downtime + ruang disk)
//
// Dijalankan oleh cron harian. Satu transaksi dibatasi TX_BUDGET_MS supaya ingest
// dan API tidak menunggu kunci tulis melebihi busy_timeout aplikasi (5 dtk).

const fs = require("fs/promises");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = process.env.DATABASE_PATH || "/app/data/cloudmail.db";
const TX_BUDGET_MS = Number(process.env.TX_BUDGET_MS || 300);
const PAUSE_MS = Number(process.env.PAUSE_MS || 100);
const MAX_MS = Number(process.env.MAX_MS || 20 * 60 * 1000);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 30000");

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

async function prune() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'email_retention_days'").get();
  const days = parseInt(row?.value ?? "90", 10);
  if (days === 0) {
    console.log("Retensi disetel 0 (simpan selamanya); tidak ada yang dihapus.");
    return;
  }

  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  const pick = db.prepare(
    "SELECT id FROM emails WHERE received_at < ? ORDER BY received_at LIMIT 500"
  );
  const pickAttachments = db.prepare(
    "SELECT storage_path FROM attachments WHERE email_id = ?"
  );
  const deleteAttachments = db.prepare("DELETE FROM attachments WHERE email_id = ?");
  const deleteEmail = db.prepare("DELETE FROM emails WHERE id = ?");

  const started = Date.now();
  let deleted = 0;
  let files = 0;

  while (Date.now() - started < MAX_MS) {
    const rows = pick.all(cutoff);
    if (rows.length === 0) break;

    // Berkas lampiran dihapus di luar transaksi supaya kunci tulis tetap singkat.
    const doomed = [];
    for (const { id } of rows) {
      for (const att of pickAttachments.all(id)) doomed.push(att.storage_path);
    }

    const txStart = Date.now();
    const removed = db.transaction((ids) => {
      let n = 0;
      for (const id of ids) {
        deleteAttachments.run(id);
        deleteEmail.run(id);
        n++;
        if (Date.now() - txStart >= TX_BUDGET_MS) break;
      }
      return n;
    })(rows.map((r) => r.id));

    deleted += removed;
    for (const rel of doomed) {
      await fs.unlink(path.join(process.cwd(), "data/uploads", rel)).then(
        () => files++,
        () => {}
      );
    }
    if (deleted % 5000 === 0) console.log(`${deleted} email dihapus...`);
    sleep(Math.max(PAUSE_MS, Date.now() - txStart));
  }

  console.log(
    `Selesai: ${deleted} email dihapus (lebih tua dari ${days} hari), ${files} berkas lampiran dibuang, ${Math.round((Date.now() - started) / 1000)} dtk.`
  );
}

function vacuum() {
  console.log("VACUUM: menulis ulang database (butuh ruang disk seukuran DB baru)...");
  const t = Date.now();
  db.exec("VACUUM");
  console.log(`VACUUM selesai dalam ${Math.round((Date.now() - t) / 1000)} dtk.`);
}

(async () => {
  if (process.argv.includes("--vacuum")) vacuum();
  else await prune();
  db.close();
})().catch((err) => {
  console.error("Gagal:", err.message);
  process.exit(1);
});
