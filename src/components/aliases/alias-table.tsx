"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, AtSign, Copy, Check } from "lucide-react";
import { QRCode } from "@/components/ui/qr-code";
import { useToast } from "@/hooks/use-toast";

interface Alias {
  id: string;
  address: string;
  localPart: string;
  description: string | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  domainName: string;
  emailCount: number;
}

interface DomainOption {
  id: string;
  domain: string;
}

export function AliasTable({ aliases, domains }: { aliases: Alias[]; domains: DomainOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Form
  const [localPart, setLocalPart] = useState("");
  const [selectedDomain, setSelectedDomain] = useState(domains[0]?.domain || "");
  const [description, setDescription] = useState("");
  const [expiresIn, setExpiresIn] = useState("0"); // 0 = never

  function resetForm() {
    setLocalPart("");
    setDescription("");
    setExpiresIn("0");
  }

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localPart,
          domain: selectedDomain,
          description,
          expiresInMinutes: parseInt(expiresIn) || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Berhasil", description: `Alias ${data.address} dibuat` });
      setShowCreate(false);
      resetForm();
      router.refresh();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch("/api/dashboard/aliases", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast({ title: "Alias dihapus" });
      router.refresh();
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    }
  }

  async function copyAddress(address: string) {
    await navigator.clipboard.writeText(address);
    setCopied(address);
    setTimeout(() => setCopied(null), 2000);
  }

  function isExpired(expiresAt: Date | null): boolean {
    return !!expiresAt && expiresAt < new Date();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Buat Alias</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Alias Email Baru</DialogTitle>
              <DialogDescription>Buat alamat email kustom pada domain Anda.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Alamat</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="nama-saya"
                    value={localPart}
                    onChange={(e) => setLocalPart(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">@</span>
                  <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((d) => (
                        <SelectItem key={d.id} value={d.domain}>{d.domain}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {localPart && selectedDomain && (
                  <p className="text-sm text-muted-foreground">Alamat lengkap: <strong>{localPart}@{selectedDomain}</strong></p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Deskripsi (opsional)</Label>
                <Input placeholder="Untuk registrasi..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Kedaluwarsa</Label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Tidak pernah</SelectItem>
                    <SelectItem value="10">10 menit</SelectItem>
                    <SelectItem value="30">30 menit</SelectItem>
                    <SelectItem value="60">1 jam</SelectItem>
                    <SelectItem value="360">6 jam</SelectItem>
                    <SelectItem value="1440">24 jam</SelectItem>
                    <SelectItem value="10080">7 hari</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Batal</Button>
              <Button onClick={handleCreate} disabled={loading || !localPart || !selectedDomain}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Buat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={!!showQR} onOpenChange={(open) => { if (!open) setShowQR(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
            <DialogDescription>{showQR}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            {showQR && <QRCode value={`mailto:${showQR}`} size={200} />}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowQR(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      {aliases.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-muted-foreground">
          <AtSign className="mb-3 h-10 w-10" />
          <p>Belum ada alias</p>
          <p className="text-sm">Buat alias email kustom untuk mulai menerima email.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alamat</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Kedaluwarsa</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aliases.map((alias) => (
                <TableRow key={alias.id} className={isExpired(alias.expiresAt) ? "opacity-50" : ""}>
                  <TableCell className="font-mono text-sm">{alias.address}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{alias.description || "-"}</TableCell>
                  <TableCell>{alias.emailCount}</TableCell>
                  <TableCell>
                    {isExpired(alias.expiresAt) ? (
                      <Badge variant="destructive">Kedaluwarsa</Badge>
                    ) : (
                      <Badge variant="success">Aktif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {alias.expiresAt
                      ? alias.expiresAt.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })
                      : "Tidak pernah"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => copyAddress(alias.address)}>
                        {copied === alias.address ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setShowQR(alias.address)}>
                        <AtSign className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(alias.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
