import { db } from "@/lib/db";
import { emails, domains } from "@/lib/db/schema";
import { desc, sql, count } from "drizzle-orm";
import { InboxTable } from "@/components/inbox/inbox-table";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const pageSize = 50;
  const offset = (currentPage - 1) * pageSize;

  const allDomains = db
    .select({ id: domains.id, domain: domains.domain })
    .from(domains)
    .orderBy(domains.domain)
    .all();

  // Get total count
  const totalResult = db
    .select({ count: count() })
    .from(emails)
    .get();
  const totalEmails = totalResult?.count || 0;
  const totalPages = Math.ceil(totalEmails / pageSize);

  // Get paginated emails
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
    .limit(pageSize)
    .offset(offset)
    .all();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kotak Masuk</h1>
        <p className="text-muted-foreground">
          Semua email yang diterima di seluruh domain. Email otomatis terhapus setelah 90 hari.
        </p>
      </div>
      <InboxTable
        emails={emailList}
        domains={allDomains}
        currentPage={currentPage}
        totalPages={totalPages}
        totalEmails={totalEmails}
      />
    </div>
  );
}
