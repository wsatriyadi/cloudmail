import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Admin Users ─────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"), // admin, viewer, api-only
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Domains ─────────────────────────────────────────────────
export const domains = sqliteTable("domains", {
  id: text("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  cloudflareZoneId: text("cloudflare_zone_id"),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Received Emails ─────────────────────────────────────────
export const emails = sqliteTable(
  "emails",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id"),
    fromAddress: text("from_address").notNull(),
    fromName: text("from_name"),
    toAddress: text("to_address").notNull(),
    subject: text("subject").notNull().default("(tanpa subjek)"),
    textBody: text("text_body"),
    htmlBody: text("html_body"),
    preview: text("preview"),
    domainId: text("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    label: text("label"), // auto-label: otp, verification, newsletter, notification
    otpCode: text("otp_code"), // extracted OTP/verification code
    rawHeaders: text("raw_headers"),
    receivedAt: integer("received_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("idx_emails_to_address").on(table.toAddress),
    index("idx_emails_domain_id").on(table.domainId),
    index("idx_emails_received_at").on(table.receivedAt),
    index("idx_emails_from_address").on(table.fromAddress),
  ]
);

// ─── Email Attachments ───────────────────────────────────────
export const attachments = sqliteTable(
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
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index("idx_attachments_email_id").on(table.emailId)]
);

// ─── API Keys ────────────────────────────────────────────────
export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  permissions: text("permissions").notNull().default('["generate","inbox"]'),
  rateLimit: integer("rate_limit").notNull().default(100),
  ipAllowlist: text("ip_allowlist"), // JSON array of allowed IPs, null = no restriction
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Rate Limit Tracking ─────────────────────────────────────
export const rateLimitEntries = sqliteTable(
  "rate_limit_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    apiKeyId: text("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    windowStart: integer("window_start").notNull(),
    requestCount: integer("request_count").notNull().default(1),
  },
  (table) => [
    uniqueIndex("idx_rate_limit_key_window").on(
      table.apiKeyId,
      table.windowStart
    ),
  ]
);

// ─── Custom Aliases ──────────────────────────────────────────
export const aliases = sqliteTable(
  "aliases",
  {
    id: text("id").primaryKey(),
    address: text("address").notNull().unique(), // full email: user@domain.com
    localPart: text("local_part").notNull(), // part before @
    domainId: text("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    description: text("description"),
    expiresAt: integer("expires_at", { mode: "timestamp" }), // null = never
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdById: text("created_by_id").references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("idx_aliases_address").on(table.address),
    index("idx_aliases_domain_id").on(table.domainId),
    index("idx_aliases_expires_at").on(table.expiresAt),
  ]
);

// ─── Audit Log ───────────────────────────────────────────────
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").references(() => users.id),
    action: text("action").notNull(), // login, create_domain, delete_email, etc.
    resource: text("resource"), // domain:xxx, email:xxx, api_key:xxx
    details: text("details"), // JSON with extra info
    ipAddress: text("ip_address"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("idx_audit_logs_user_id").on(table.userId),
    index("idx_audit_logs_action").on(table.action),
    index("idx_audit_logs_created_at").on(table.createdAt),
  ]
);

// ─── Settings (Key-Value) ────────────────────────────────────
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
