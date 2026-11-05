import { db } from "@/lib/db";
import { emails, domains } from "@/lib/db/schema";
import { desc, sql, count } from "drizzle-orm";
import { emailScopeCondition } from "@/lib/address-access";
import { requireUser } from "@/lib/authz";
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

  const user = await requireUser();
  const scope = emailScopeCondition(user.id, user.role);

  const allDomains = await db
    .select({ id: domains.id, domain: domains.domain })
    .from(domains)
    .orderBy(domains.domain);

  // Get total count
  const totalResult = (await db
    .select({ count: count() })
    .from(emails)
    .where(scope))[0];
  const totalEmails = Number(totalResult?.count ?? 0);
  const totalPages = Math.ceil(totalEmails / pageSize);

  // Get paginated emails
  const emailList = await db
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
      hasAttachments: sql<boolean>`EXISTS(SELECT 1 FROM attachments WHERE attachments.email_id = emails.id)`,
    })
    .from(emails)
    .where(scope)
    .limit(pageSize)
    .offset(offset);

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
