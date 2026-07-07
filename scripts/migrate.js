const Database = require('better-sqlite3');
const db = new Database('/app/data/cloudmail.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    domain TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1,
    cloudflare_zone_id TEXT,
    description TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS emails (
    id TEXT PRIMARY KEY,
    message_id TEXT,
    from_address TEXT NOT NULL,
    from_name TEXT,
    to_address TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT '(tanpa subjek)',
    text_body TEXT,
    html_body TEXT,
    preview TEXT,
    domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    is_read INTEGER NOT NULL DEFAULT 0,
    label TEXT,
    otp_code TEXT,
    raw_headers TEXT,
    received_at INTEGER NOT NULL DEFAULT (unixepoch()),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE INDEX IF NOT EXISTS idx_emails_to_address ON emails(to_address)`,
  `CREATE INDEX IF NOT EXISTS idx_emails_domain_id ON emails(domain_id)`,
  `CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at)`,
  `CREATE INDEX IF NOT EXISTS idx_emails_from_address ON emails(from_address)`,
  `CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    email_id TEXT NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE INDEX IF NOT EXISTS idx_attachments_email_id ON attachments(email_id)`,
  `CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT '["generate","inbox"]',
    rate_limit INTEGER NOT NULL DEFAULT 100,
    ip_allowlist TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_used_at INTEGER,
    expires_at INTEGER,
    created_by_id TEXT NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS rate_limit_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    window_start INTEGER NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_key_window ON rate_limit_entries(api_key_id, window_start)`,
  `CREATE TABLE IF NOT EXISTS aliases (
    id TEXT PRIMARY KEY,
    address TEXT NOT NULL UNIQUE,
    local_part TEXT NOT NULL,
    domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    description TEXT,
    expires_at INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by_id TEXT REFERENCES users(id),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE INDEX IF NOT EXISTS idx_aliases_address ON aliases(address)`,
  `CREATE INDEX IF NOT EXISTS idx_aliases_domain_id ON aliases(domain_id)`,
  `CREATE INDEX IF NOT EXISTS idx_aliases_expires_at ON aliases(expires_at)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    resource TEXT,
    details TEXT,
    ip_address TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`
];

for (const s of statements) {
  db.exec(s);
}
console.log('All tables created successfully');
db.close();
