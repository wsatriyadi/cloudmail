"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Loader2, Globe, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Domain {
  id: string;
  domain: string;
  isActive: boolean;
  description: string | null;
  createdAt: Date;
  emailCount: number;
}

export function DomainTable({ domains }: { domains: Domain[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState<Domain | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  // Form state
  const [domain, setDomain] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  function resetForm() {
    setDomain("");
    setDescription("");
    setIsActive(true);
  }

  async function handleAdd() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, description, isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Berhasil", description: `Domain ${domain} ditambahkan` });
      setShowAdd(false);
      setShowSetup(true);
      resetForm();
      router.refresh();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit() {
    if (!showEdit) return;
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/domains", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: showEdit.id, domain, description, isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Berhasil", description: "Domain diperbarui" });
      setShowEdit(null);
      resetForm();
      router.refresh();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/domains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Berhasil", description: "Domain dihapus" });
      setShowDelete(null);
      router.refresh();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string, currentActive: boolean) {
    try {
      const res = await fetch("/api/dashboard/domains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      router.refresh();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Tambah Domain
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Domain Baru</DialogTitle>
              <DialogDescription>
                Masukkan domain yang akan digunakan untuk menerima email sementara.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Domain</Label>
                <Input placeholder="mail.contoh.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi (opsional)</Label>
                <Textarea placeholder="Catatan tentang domain ini" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Aktif</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Batal</Button>
              <Button onClick={handleAdd} disabled={loading || !domain}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tambah
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Setup Instructions Dialog */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" /> Instruksi Setup Cloudflare
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Untuk mengaktifkan penerimaan email pada domain ini, ikuti langkah berikut:</p>
            <ol className="list-decimal space-y-2 pl-4">
              <li>Buka <strong>Cloudflare Dashboard</strong> → pilih domain Anda</li>
              <li>Navigasi ke <strong>Email → Email Routing</strong></li>
              <li>Aktifkan <strong>Email Routing</strong> untuk domain</li>
              <li>Buat aturan <strong>Catch-all</strong> → pilih action <strong>&quot;Send to Worker&quot;</strong></li>
              <li>Pilih atau deploy Worker <code>tempmail-email-worker</code></li>
              <li>Pastikan Worker sudah dikonfigurasi dengan <strong>Backend URL</strong> dan <strong>Secret</strong> yang benar</li>
            </ol>
            <p className="text-muted-foreground">
              Lihat halaman Pengaturan → Konfigurasi Worker untuk mendapatkan secret dan URL backend.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSetup(false)}>Mengerti</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!showEdit} onOpenChange={(open) => { if (!open) { setShowEdit(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Domain</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEdit(null); resetForm(); }}>Batal</Button>
            <Button onClick={handleEdit} disabled={loading || !domain}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDelete} onOpenChange={(open) => { if (!open) setShowDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Domain</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus domain ini? Semua email terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => showDelete && handleDelete(showDelete)} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      {domains.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-muted-foreground">
          <Globe className="mb-3 h-10 w-10" />
          <p>Belum ada domain</p>
          <p className="text-sm">Tambahkan domain pertama Anda untuk mulai menerima email.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email Diterima</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.domain}</TableCell>
                  <TableCell>
                    <Badge
                      variant={d.isActive ? "success" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggle(d.id, d.isActive)}
                    >
                      {d.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>{d.emailCount.toLocaleString("id-ID")}</TableCell>
                  <TableCell>
                    {d.createdAt.toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDomain(d.domain);
                          setDescription(d.description || "");
                          setIsActive(d.isActive);
                          setShowEdit(d);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setShowDelete(d.id)}>
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
