import { db } from "@/lib/db";
import { emails, domains } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";
import { InboxTable } from "@/components/inbox/inbox-table";

export default function InboxPage() {
  return <InboxContent />;
}

function InboxContent() {
  const allDomains = db
    .select({ id: domains.id, domain: domains.domain })
    .from(domains)
    .orderBy(domains.domain)
    .all();

  const emailList = db
    .select({
      id: emails.id,
      fromAddress: emails.fromAddress,
      fromName: emails.fromName,
      toAddress: emails.toAddress,
      subject: emails.subject,
      preview: emails.preview,
      receivedAt: emails.receivedAt,
      isRead: emails.isRead,
      domainId: emails.domainId,
      label: emails.label,
      otpCode: emails.otpCode,
      hasAttachments: sql<boolean>`EXISTS(SELECT 1 FROM attachments WHERE attachments.email_id = ${emails.id})`,
    })
    .from(emails)
    .orderBy(desc(emails.receivedAt))
    .limit(100)
    .all();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kotak Masuk</h1>
        <p className="text-muted-foreground">
          Semua email yang diterima di seluruh domain.
        </p>
      </div>
      <InboxTable emails={emailList} domains={allDomains} />
    </div>
  );
}
