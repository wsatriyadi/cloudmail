"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Copy, Check, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Identity {
  firstName: string;
  lastName: string;
  username: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  domain: string;
  source: string;
}

export function IdentityGenerator() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIdentity(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal generate identitas";
      toast({ title: "Gagal", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Identitas</CardTitle>
        <CardDescription>
          Buat identitas baru dengan nama, tanggal lahir, dan alamat email di domain aktif.
          Nama diambil dari koleksi nama; jika belum ada pasangan sesama gender, dibuat oleh LLM.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
          Generate Identitas
        </Button>

        {identity && (
          <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{identity.firstName} {identity.lastName}</span>
              <Badge variant="secondary">{identity.gender}</Badge>
              <Badge variant="outline">{identity.source === "collection" ? "Koleksi" : "LLM"}</Badge>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Tanggal Lahir</dt>
                <dd className="font-mono">{identity.dateOfBirth}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Username</dt>
                <dd className="font-mono">{identity.username}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="flex items-center gap-2">
                  <code className="font-mono">{identity.email}</code>
                  <Button variant="ghost" size="icon" onClick={() => copy(identity.email)}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </dd>
              </div>
            </dl>
            <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Lagi
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
