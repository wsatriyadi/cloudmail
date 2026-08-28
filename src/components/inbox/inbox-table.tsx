"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Mail, MailOpen, Paperclip, Search, Inbox, Copy, Check, KeyRound } from "lucide-react";
import { getLabelInfo } from "@/lib/email-utils";
import { useRealtimeInbox } from "@/hooks/use-realtime-inbox";

interface Email {
  id: string;
  fromAddress: string;
  fromName: string | null;
  toAddress: string;
  subject: string;
  preview: string | null;
  receivedAt: Date;
  isRead: boolean;
  domainId: string;
  label: string | null;
  otpCode: string | null;
  hasAttachments: boolean;
}

interface DomainOption {
  id: string;
  domain: string;
}

export function InboxTable({ emails, domains }: { emails: Email[]; domains: DomainOption[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);

  // Realtime inbox
  const { connected, newCount, resetCount } = useRealtimeInbox({
    onNewEmails: () => {
      // Auto refresh when new emails arrive
      router.refresh();
    },
  });

  const filtered = useMemo(() => {
    return emails.filter((email) => {
      const matchSearch =
        !search ||
        email.toAddress.toLowerCase().includes(search.toLowerCase()) ||
        email.fromAddress.toLowerCase().includes(search.toLowerCase()) ||
        email.subject.toLowerCase().includes(search.toLowerCase());

      const matchDomain =
        domainFilter === "all" || email.domainId === domainFilter;

      return matchSearch && matchDomain;
    });
  }, [emails, search, domainFilter]);

  async function copyOtp(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedOtp(code);
    setTimeout(() => setCopiedOtp(null), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Realtime indicator */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${connected ? "bg-success" : "bg-muted-foreground"}`}
          aria-hidden="true"
        />
        <span role="status" className="text-muted-foreground">
          {connected ? "Realtime aktif" : "Menghubungkan…"}
        </span>
        {newCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetCount();
              router.refresh();
            }}
          >
            Muat {newCount} email baru
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari alamat, pengirim, atau subjek"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Cari email"
          />
        </div>
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filter domain">
            <SelectValue placeholder="Semua domain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua domain</SelectItem>
            {domains.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.domain}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Email List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed px-6 py-14 text-center">
          <Inbox className="mb-3 h-9 w-9 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">
            {search || domainFilter !== "all"
              ? "Tidak ada email yang cocok"
              : "Belum ada email masuk"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {search || domainFilter !== "all"
              ? "Ubah kata kunci atau pilih domain lain."
              : "Email yang dikirim ke domain aktif akan muncul di sini secara otomatis."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Pengirim</TableHead>
                <TableHead>Tujuan</TableHead>
                <TableHead>Subjek</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>OTP</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((email) => {
                const labelInfo = getLabelInfo(email.label);
                return (
                  <TableRow key={email.id} className={!email.isRead ? "font-medium" : ""}>
                    <TableCell>
                      {email.isRead ? (
                        <MailOpen className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Mail className="h-4 w-4 text-primary" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/inbox/${email.id}`}
                        className="break-anywhere rounded-sm hover:underline"
                      >
                        {email.fromName || email.fromAddress}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="break-anywhere text-sm text-muted-foreground">
                        {email.toAddress}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/inbox/${email.id}`}
                        className="break-anywhere rounded-sm hover:underline"
                      >
                        {email.subject}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {email.label && (
                        <Badge variant={labelInfo.variant}>{labelInfo.text}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {email.otpCode && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 font-mono text-xs"
                          onClick={() => copyOtp(email.otpCode!)}
                        >
                          <KeyRound className="h-3 w-3" />
                          {email.otpCode}
                          {copiedOtp === email.otpCode ? (
                            <Check className="h-3 w-3 text-success" aria-hidden="true" />
                          ) : (
                            <Copy className="h-3 w-3" aria-hidden="true" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(email.receivedAt, { addSuffix: true, locale: idLocale })}
                    </TableCell>
                    <TableCell>
                      {email.hasAttachments && <Paperclip className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Menampilkan {filtered.length} dari {emails.length} email
      </p>
    </div>
  );
}
