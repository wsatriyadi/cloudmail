import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { Mail, MailOpen } from "lucide-react";

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
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Mail className="mb-2 h-8 w-8" />
        <p className="text-sm">Belum ada email</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {emails.map((email) => (
        <Link
          key={email.id}
          href={`/dashboard/inbox/${email.id}`}
          className="flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-muted"
        >
          <div className="mt-1">
            {email.isRead ? (
              <MailOpen className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Mail className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1 space-y-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="truncate text-sm font-medium">
                {email.fromName || email.fromAddress}
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDistanceToNow(email.receivedAt, {
                  addSuffix: true,
                  locale: id,
                })}
              </span>
            </div>
            <p className="truncate text-sm">{email.subject}</p>
            <p className="truncate text-xs text-muted-foreground">
              → {email.toAddress}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
