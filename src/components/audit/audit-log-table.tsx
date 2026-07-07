"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, ScrollText } from "lucide-react";

interface AuditLog {
  id: number;
  action: string;
  resource: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: Date;
  userName: string | null;
}

const actionLabels: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  login: { text: "Login", variant: "default" },
  logout: { text: "Logout", variant: "secondary" },
  create_domain: { text: "Tambah Domain", variant: "default" },
  update_domain: { text: "Update Domain", variant: "secondary" },
  delete_domain: { text: "Hapus Domain", variant: "destructive" },
  create_api_key: { text: "Buat API Key", variant: "default" },
  delete_api_key: { text: "Hapus API Key", variant: "destructive" },
  delete_email: { text: "Hapus Email", variant: "destructive" },
  change_password: { text: "Ganti Password", variant: "outline" },
  update_settings: { text: "Update Pengaturan", variant: "secondary" },
  create_alias: { text: "Buat Alias", variant: "default" },
  delete_alias: { text: "Hapus Alias", variant: "destructive" },
  generate_identity: { text: "Generate Identitas", variant: "secondary" },
  backup_download: { text: "Download Backup", variant: "outline" },
  restore_upload: { text: "Restore Backup", variant: "outline" },
  regenerate_secret: { text: "Regenerate Secret", variant: "destructive" },
};

export function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        !search ||
        log.action.includes(search.toLowerCase()) ||
        (log.resource || "").toLowerCase().includes(search.toLowerCase()) ||
        (log.userName || "").toLowerCase().includes(search.toLowerCase());

      const matchAction = actionFilter === "all" || log.action === actionFilter;

      return matchSearch && matchAction;
    });
  }, [logs, search, actionFilter]);

  const uniqueActions = [...new Set(logs.map((l) => l.action))];

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari aktivitas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Semua aksi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua aksi</SelectItem>
            {uniqueActions.map((action) => (
              <SelectItem key={action} value={action}>
                {actionLabels[action]?.text || action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-muted-foreground">
          <ScrollText className="mb-3 h-10 w-10" />
          <p>Tidak ada log aktivitas</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Pengguna</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => {
                const label = actionLabels[log.action] || { text: log.action, variant: "secondary" as const };
                const details = log.details ? JSON.parse(log.details) : null;
                return (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {log.createdAt.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                    <TableCell className="text-sm">{log.userName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={label.variant}>{label.text}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground max-w-[200px] truncate">
                      {log.resource || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.ipAddress || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {details ? JSON.stringify(details) : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Menampilkan {filtered.length} dari {logs.length} log
      </p>
    </div>
  );
}
