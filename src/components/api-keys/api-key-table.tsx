"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Copy, Loader2, Key, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string;
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export function ApiKeyTable({ apiKeys }: { apiKeys: ApiKey[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [rateLimit, setRateLimit] = useState(100);
  const [permGenerate, setPermGenerate] = useState(true);
  const [permInbox, setPermInbox] = useState(true);

  function resetForm() {
    setName("");
    setRateLimit(100);
    setPermGenerate(true);
    setPermInbox(true);
  }

  async function handleCreate() {
    setLoading(true);
    try {
      const permissions: string[] = [];
      if (permGenerate) permissions.push("generate");
      if (permInbox) permissions.push("inbox");

      const res = await fetch("/api/dashboard/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rateLimit, permissions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowCreate(false);
      setShowKey(data.key); // Show the full key once
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
      const res = await fetch("/api/dashboard/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast({ title: "Kunci API dihapus" });
      router.refresh();
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      await fetch("/api/dashboard/api-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      router.refresh();
    } catch {
      toast({ title: "Gagal mengubah status", variant: "destructive" });
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Buat Kunci API</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Kunci API Baru</DialogTitle>
              <DialogDescription>Kunci hanya ditampilkan sekali setelah dibuat. Pastikan untuk menyalinnya.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input placeholder="Aplikasi Utama" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Rate Limit (req/menit)</Label>
                <Input type="number" value={rateLimit} onChange={(e) => setRateLimit(parseInt(e.target.value) || 100)} />
              </div>
              <div className="space-y-2">
                <Label>Izin</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={permGenerate} onCheckedChange={setPermGenerate} />
                    <span className="text-sm">Generate (POST /api/generate)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={permInbox} onCheckedChange={setPermInbox} />
                    <span className="text-sm">Inbox (GET /api/inbox/*)</span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Batal</Button>
              <Button onClick={handleCreate} disabled={loading || !name}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Buat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Show Key Dialog */}
      <Dialog open={!!showKey} onOpenChange={(open) => { if (!open) setShowKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kunci API Dibuat</DialogTitle>
            <DialogDescription>Salin kunci ini sekarang. Kunci tidak akan ditampilkan lagi.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-muted p-3 text-sm font-mono break-all">{showKey}</code>
            <Button variant="outline" size="icon" onClick={() => showKey && copyToClipboard(showKey)}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowKey(null)}>Sudah Disalin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      {apiKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-muted-foreground">
          <Key className="mb-3 h-10 w-10" />
          <p>Belum ada kunci API</p>
          <p className="text-sm">Buat kunci API untuk mengakses endpoint secara programatis.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kunci</TableHead>
                <TableHead>Izin</TableHead>
                <TableHead>Rate Limit</TableHead>
                <TableHead>Terakhir Digunakan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => {
                const perms = JSON.parse(key.permissions) as string[];
                return (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="text-sm text-muted-foreground">{key.keyPrefix}...</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {perms.map((p) => (
                          <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{key.rateLimit}/mnt</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.lastUsedAt
                        ? key.lastUsedAt.toLocaleDateString("id-ID")
                        : "Belum pernah"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={key.isActive ? "success" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => handleToggle(key.id, key.isActive)}
                      >
                        {key.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(key.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
