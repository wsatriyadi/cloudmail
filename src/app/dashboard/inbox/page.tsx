import { db } from "@/lib/db";
import { emails, domains } from "@/lib/db/schema";
import { desc, sql, count, inArray } from "drizzle-orm";
import { emailScopeFor } from "@/lib/address-access";
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
  // null = admin lihat semuanya; array = hanya alamat milik pengguna ini.
  const scope = await emailScopeFor(user.id, user.role);

  const allDomains = db
    .select({ id: domains.id, domain: domains.domain })
    .from(domains)
    .orderBy(domains.domain)
    .all();

  // Get total count
  const totalResult = db
    .select({ count: count() })
    .from(emails)
    .where(scope ? inArray(emails.toAddress, scope) : undefined)
    .get();
  const totalEmails = totalResult?.count ?? 0;
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
      hasAttachments: sql<boolean>`EXISTS(SELECT 1 FROM attachments WHERE attachments.email_id = emails.id)`,
    })
    .from(emails)
    .where(scope ? inArray(emails.toAddress, scope) : undefined)
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
