import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export type AuditAction =
  | "login"
  | "logout"
  | "create_domain"
  | "update_domain"
  | "delete_domain"
  | "create_api_key"
  | "delete_api_key"
  | "delete_email"
  | "change_password"
  | "update_settings"
  | "create_alias"
  | "delete_alias"
  | "generate_identity"
  | "backup_download"
  | "restore_upload"
  | "regenerate_secret";

export function logAudit(params: {
  userId?: string | null;
  action: AuditAction;
  resource?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}) {
  try {
    db.insert(auditLogs)
      .values({
        userId: params.userId || null,
        action: params.action,
        resource: params.resource || null,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress || null,
      })
      .run();
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

export function getClientIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
