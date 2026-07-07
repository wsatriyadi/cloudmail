"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trash2, Download, Paperclip, ChevronDown, ChevronUp, Copy, Check, KeyRound } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getLabelInfo } from "@/lib/email-utils";
import { QRCode } from "@/components/ui/qr-code";

interface EmailData {
  id: string;
  fromAddress: string;
  fromName: string | null;
  toAddress: string;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  rawHeaders: string | null;
  receivedAt: Date;
  label: string | null;
  otpCode: string | null;
}

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function EmailViewer({
  email,
  attachments,
}: {
  email: EmailData;
  attachments: Attachment[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [showHeaders, setShowHeaders] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/emails`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: email.id }),
      });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast({ title: "Email dihapus" });
      router.push("/dashboard/inbox");
      router.refresh();
    } catch {
      toast({ title: "Gagal menghapus email", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  async function copyOtp() {
    if (!email.otpCode) return;
    await navigator.clipboard.writeText(email.otpCode);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  }

  const headers = email.rawHeaders ? JSON.parse(email.rawHeaders) : null;
  const labelInfo = getLabelInfo(email.label);

  return (
    <div className="space-y-4">
      {/* Back & Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/dashboard/inbox")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowQR(!showQR)}>
            QR
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="mr-2 h-4 w-4" /> Hapus
          </Button>
        </div>
      </div>

      {/* OTP Code - Prominent Display */}
      {email.otpCode && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <KeyRound className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Kode OTP / Verifikasi</p>
                <p className="text-3xl font-bold font-mono tracking-widest">{email.otpCode}</p>
              </div>
            </div>
            <Button onClick={copyOtp} variant="outline" size="lg">
              {copiedOtp ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copiedOtp ? "Tersalin!" : "Salin Kode"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* QR Code */}
      {showQR && (
        <Card>
          <CardContent className="flex flex-col items-center py-6">
            <p className="mb-3 text-sm text-muted-foreground">{email.toAddress}</p>
            <QRCode value={`mailto:${email.toAddress}`} size={180} />
          </CardContent>
        </Card>
      )}

      {/* Email Header */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold flex-1">{email.subject}</h1>
            {email.label && (
              <Badge variant={labelInfo.variant}>{labelInfo.text}</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Dari: </span>
              <span className="font-medium">
                {email.fromName ? `${email.fromName} <${email.fromAddress}>` : email.fromAddress}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Kepada: </span>
              <span className="font-medium">{email.toAddress}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Waktu: </span>
              <span>
                {email.receivedAt.toLocaleString("id-ID", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </span>
            </div>
          </div>

          {/* Raw Headers Toggle */}
          {headers && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHeaders(!showHeaders)}
                className="text-xs text-muted-foreground"
              >
                {showHeaders ? <ChevronUp className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
                {showHeaders ? "Sembunyikan" : "Tampilkan"} header lengkap
              </Button>
              {showHeaders && (
                <pre className="mt-2 max-h-60 overflow-auto rounded bg-muted p-3 text-xs">
                  {Object.entries(headers)
                    .map(([key, val]) => `${key}: ${val}`)
                    .join("\n")}
                </pre>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Attachments */}
      {attachments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Paperclip className="h-4 w-4" />
              {attachments.length} Lampiran
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {attachments.map((att) => (
                <a
                  key={att.id}
                  href={`/api/inbox/attachment/${att.id}`}
                  download={att.filename}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>{att.filename}</span>
                  <Badge variant="secondary" className="text-xs">
                    {formatBytes(att.size)}
                  </Badge>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Body */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue={email.htmlBody ? "html" : "text"}>
            <TabsList>
              {email.htmlBody && <TabsTrigger value="html">HTML</TabsTrigger>}
              {email.textBody && <TabsTrigger value="text">Teks</TabsTrigger>}
            </TabsList>
            {email.htmlBody && (
              <TabsContent value="html">
                <iframe
                  srcDoc={email.htmlBody}
                  sandbox="allow-popups"
                  className="w-full min-h-[400px] rounded border bg-white"
                  style={{ border: "none" }}
                  onLoad={(e) => {
                    const iframe = e.currentTarget;
                    const doc = iframe.contentDocument;
                    if (doc) {
                      iframe.style.height = Math.max(doc.body.scrollHeight + 20, 400) + "px";
                    }
                  }}
                />
              </TabsContent>
            )}
            {email.textBody && (
              <TabsContent value="text">
                <pre className="whitespace-pre-wrap rounded bg-muted p-4 text-sm">
                  {email.textBody}
                </pre>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
