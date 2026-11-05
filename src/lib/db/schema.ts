import { pgTable, text, integer, boolean, timestamp, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Admin Users ─────────────────────────────────────────────
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"), // admin, pelanggan, viewer, api-only
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Domains ─────────────────────────────────────────────────
export const domains = pgTable("domains", {
  id: text("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  cloudflareZoneId: text("cloudflare_zone_id"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Received Emails ─────────────────────────────────────────
// Body besar disimpan terpisah (email_bodies) agar baris tetap kecil.
export const emails = pgTable(
  "emails",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id"),
    fromAddress: text("from_address").notNull(),
    fromName: text("from_name"),
    toAddress: text("to_address").notNull(),
    subject: text("subject").notNull().default("(tanpa subjek)"),
    preview: text("preview"),
    domainId: text("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    isRead: boolean("is_read").notNull().default(false),
    label: text("label"),
    otpCode: text("otp_code"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_emails_to_address").on(table.toAddress),
    index("idx_emails_domain_id").on(table.domainId),
    index("idx_emails_received_at").on(table.receivedAt),
    index("idx_emails_from_address").on(table.fromAddress),
    index("idx_emails_message_id").on(table.messageId),
    index("idx_emails_is_read").on(table.isRead),
    index("idx_emails_inbox_cover").on(
      table.toAddress,
      sql`${table.receivedAt} DESC`,
      table.isRead,
      table.label,
      table.otpCode,
      table.preview,
      table.id
    ),
  ]
);

// ─── Email Bodies ────────────────────────────────────────────
export const emailBodies = pgTable("email_bodies", {
  emailId: text("email_id")
    .primaryKey()
    .references(() => emails.id, { onDelete: "cascade" }),
  textBody: text("text_body"),
  htmlBody: text("html_body"),
  rawHeaders: text("raw_headers"),
});

// ─── Email Attachments ───────────────────────────────────────
export const attachments = pgTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    emailId: text("email_id")
      .notNull()
      .references(() => emails.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    storagePath: text("storage_path").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_attachments_email_id").on(table.emailId)]
);

// ─── API Keys ────────────────────────────────────────────────
export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  permissions: text("permissions").notNull().default('["generate","inbox"]'),
  rateLimit: integer("rate_limit").notNull().default(100),
  ipAllowlist: text("ip_allowlist"), // JSON array of allowed IPs, null = no restriction
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Rate Limit Tracking ─────────────────────────────────────
export const rateLimitEntries = pgTable(
  "rate_limit_entries",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    apiKeyId: text("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    windowStart: integer("window_start").notNull(),
    requestCount: integer("request_count").notNull().default(1),
  },
  (table) => [
    uniqueIndex("idx_rate_limit_key_window").on(table.apiKeyId, table.windowStart),
  ]
);

// ─── Custom Aliases ──────────────────────────────────────────
export const aliases = pgTable(
  "aliases",
  {
    id: text("id").primaryKey(),
    address: text("address").notNull().unique(),
    localPart: text("local_part").notNull(),
    domainId: text("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    description: text("description"),
    expiresAt: timestamp("expires_at", { withTimezone: true }), // null = never
    isActive: boolean("is_active").notNull().default(true),
    createdById: text("created_by_id").references(() => users.id),
    // Diisi bila alias dibuat lewat API key (pelanggan). Pemilik alias.
    apiKeyId: text("api_key_id").references(() => apiKeys.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_aliases_address").on(table.address),
    index("idx_aliases_domain_id").on(table.domainId),
    index("idx_aliases_expires_at").on(table.expiresAt),
    index("idx_aliases_created_by").on(table.createdById),
    index("idx_aliases_api_key").on(table.apiKeyId),
  ]
);

// ─── Audit Log ───────────────────────────────────────────────
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id").references(() => users.id),
    action: text("action").notNull(),
    resource: text("resource"),
    details: text("details"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_audit_logs_user_id").on(table.userId),
    index("idx_audit_logs_action").on(table.action),
    index("idx_audit_logs_created_at").on(table.createdAt),
  ]
);

// ─── Settings (Key-Value) ────────────────────────────────────
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Koleksi Nama ────────────────────────────────────────────
// Duplikat dicegah per gender, case-insensitive (lower() index di PostgreSQL).
export const namaDepan = pgTable(
  "nama_depan",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    gender: text("gender").notNull(),
    namaDepan: text("nama_depan").notNull(),
  },
  (table) => [
    uniqueIndex("idx_nama_depan_unik").on(table.gender, sql`lower(${table.namaDepan})`),
    check("nama_depan_gender_check", sql`${table.gender} IN ('male', 'female')`),
  ]
);

export const namaBelakang = pgTable(
  "nama_belakang",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    gender: text("gender").notNull(),
    namaBelakang: text("nama_belakang").notNull(),
  },
  (table) => [
    uniqueIndex("idx_nama_belakang_unik").on(table.gender, sql`lower(${table.namaBelakang})`),
    check("nama_belakang_gender_check", sql`${table.gender} IN ('male', 'female')`),
  ]
);

// ─── Identitas yang Sudah Diberikan ──────────────────────────
export const identitas = pgTable(
  "identitas",
  {
    id: text("id").primaryKey(),
    address: text("address").notNull().unique(),
    username: text("username").notNull(),
    domainId: text("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    gender: text("gender").notNull(),
    dateOfBirth: text("date_of_birth").notNull(),
    source: text("source").notNull(),
    apiKeyId: text("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_identitas_user").on(table.userId),
    index("idx_identitas_api_key").on(table.apiKeyId),
  ]
);
