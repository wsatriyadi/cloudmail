"use client";

import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, Pencil, Loader2, Globe, Info, CheckCircle2, XCircle, Search } from "lucide-react";
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

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Form state
  const [domain, setDomain] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Bulk add state
  const [addMode, setAddMode] = useState("single");
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState<{
    added: string[];
    skipped: Array<{ domain: string; reason: string }>;
  } | null>(null);

  // Filtered domains
  const filtered = useMemo(() => {
    return domains.filter((d) => {
      const matchSearch =
        !search ||
        d.domain.toLowerCase().includes(search.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && d.isActive) ||
        (statusFilter === "inactive" && !d.isActive);

      return matchSearch && matchStatus;
    });
  }, [domains, search, statusFilter]);

  function resetForm() {
    setDomain("");
    setDescription("");
    setIsActive(true);
    setBulkText("");
    setBulkResult(null);
  }

  async function handleAdd() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, description, isActive }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Berhasil", description: "Domain ditambahkan" });
      setShowAdd(false);
      resetForm();
      router.refresh();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: String(error) });
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkAdd() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/domains/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains: bulkText, description, isActive }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setBulkResult(data);
      toast({ title: "Berhasil", description: `${data.added.length} domain ditambahkan` });
      router.refresh();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: String(error) });
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit() {
    if (!showEdit) return;
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/domains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: showEdit.id, domain, description, isActive }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Berhasil", description: "Domain diperbarui" });
      setShowEdit(null);
      resetForm();
      router.refresh();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: String(error) });
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
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Berhasil", description: "Domain dihapus" });
      setShowDelete(null);
      router.refresh();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: String(error) });
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
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: String(error) });
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari domain atau deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Cari domain"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]" aria-label="Filter status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Add Button */}
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
            <Tabs value={addMode} onValueChange={(v) => { setAddMode(v); setBulkResult(null); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">Satu Domain</TabsTrigger>
                <TabsTrigger value="bulk">Banyak Domain</TabsTrigger>
              </TabsList>

              <TabsContent value="single">
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
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setShowAdd(false)}>Batal</Button>
                  <Button onClick={handleAdd} disabled={loading || !domain}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Tambah
                  </Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="bulk">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Daftar Domain</Label>
                    <Textarea
                      placeholder={"mail.contoh.com\nmail.contoh2.com\nmail.contoh3.com"}
                      className="min-h-[140px] font-mono text-sm"
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Satu domain per baris. Baris kosong, duplikat, format tidak valid, dan yang sudah terdaftar akan dilewati otomatis.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Deskripsi (opsional)</Label>
                    <Textarea placeholder="Diterapkan ke semua domain di daftar" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                    <Label>Aktif</Label>
                  </div>

                  {bulkResult && (
                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-3 text-sm">
                      {bulkResult.added.length > 0 && (
                        <p className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          {bulkResult.added.length} ditambahkan
                        </p>
                      )}
                      {bulkResult.skipped.map((s) => (
                        <p key={s.domain} className="flex items-center gap-2 text-muted-foreground">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="font-mono">{s.domain}</span>
                          <span className="text-xs">— {s.reason}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setShowAdd(false)}>Tutup</Button>
                  <Button onClick={handleBulkAdd} disabled={loading || !bulkText.trim()}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Tambah Semua
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
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
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed px-6 py-14 text-center">
          <Globe className="mb-3 h-9 w-9 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">
            {search || statusFilter !== "all"
              ? "Tidak ada domain yang cocok"
              : "Belum ada domain"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {search || statusFilter !== "all"
              ? "Ubah kata kunci atau filter status."
              : "Tambahkan domain pertama Anda untuk mulai menerima email."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Email</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-sm font-medium">{d.domain}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {d.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={d.isActive ? "success" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggle(d.id, d.isActive)}
                    >
                      {d.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {d.emailCount.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
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

      <p className="text-sm text-muted-foreground">
        Menampilkan {filtered.length} dari {domains.length} domain
      </p>
    </div>
  );
}
