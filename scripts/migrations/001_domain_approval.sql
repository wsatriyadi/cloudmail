-- Domain approval workflow + owner tracking
-- Jalankan sekali pada database PostgreSQL produksi:
--   psql "$DATABASE_URL" -f scripts/migrations/001_domain_approval.sql

ALTER TABLE domains
  ADD COLUMN IF NOT EXISTS created_by_id text REFERENCES users(id) ON DELETE SET NULL;

-- Domain lama otomatis dianggap approved supaya tetap bisa dipakai.
ALTER TABLE domains
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

CREATE INDEX IF NOT EXISTS idx_domains_created_by ON domains (created_by_id);
CREATE INDEX IF NOT EXISTS idx_domains_status ON domains (status);
