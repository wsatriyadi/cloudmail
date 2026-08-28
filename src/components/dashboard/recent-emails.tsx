import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { Mail, MailOpen, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Email {
  id: string;
  fromAddress: string;
  fromName: string | null;
  toAddress: string;
  subject: string;
  preview: string | null;
  receivedAt: Date;
  isRead: boolean;
}

export function RecentEmails({ emails }: { emails: Email[] }) {
  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Mail className="mb-3 h-10 w-10 opacity-50" />
        <p className="text-sm font-medium">Belum ada email</p>
        <p className="mt-1 text-xs">Email akan muncul di sini saat diterima</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {emails.map((email) => (
        <Link
          key={email.id}
          href={`/dashboard/inbox/${email.id}`}
          className={cn(
            "flex items-start gap-3 rounded-lg border border-transparent p-3 transition-all hover:border-border hover:bg-muted/50",
            !email.isRead && "bg-primary/5"
          )}
        >
          {/* Icon & Unread Indicator */}
          <div className="relative mt-0.5 shrink-0">
            {email.isRead ? (
              <MailOpen className="h-4 w-4 text-muted-foreground" />
            ) : (
              <>
                <Mail className="h-4 w-4 text-primary" />
                <Circle className="absolute -right-1 -top-1 h-2 w-2 fill-primary text-primary" />
              </>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 space-y-1 overflow-hidden">
            {/* From & Time */}
            <div className="flex items-center justify-between gap-2">
              <p className={cn(
                "truncate text-sm",
                !email.isRead ? "font-semibold" : "font-medium"
              )}>
                {email.fromName || email.fromAddress}
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDistanceToNow(email.receivedAt, {
                  addSuffix: true,
                  locale: id,
                })}
              </span>
            </div>

            {/* Subject */}
            <p className={cn(
              "truncate text-sm",
              !email.isRead ? "font-medium text-foreground" : "text-muted-foreground"
            )}>
              {email.subject || "(Tanpa subjek)"}
            </p>

            {/* Preview */}
            {email.preview && (
              <p className="truncate text-xs text-muted-foreground">
                {email.preview}
              </p>
            )}

            {/* To Address */}
            <p className="truncate text-xs text-muted-foreground font-mono">
              → {email.toAddress}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
