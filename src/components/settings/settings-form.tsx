"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Eye, EyeOff, Copy, Check, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SettingsForm({ settings, isAdmin }: { settings: Record<string, string>; isAdmin: boolean }) {
  const router = useRouter();
  const { toast } = useToast();

  // Platform
  const [platformName, setPlatformName] = useState(settings.platform_name || "CloudMail");
  const [savingPlatform, setSavingPlatform] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // LLM
  const [llmEndpoint, setLlmEndpoint] = useState(settings.llm_endpoint || "https://api.openai.com/v1");
  const [llmApiKey, setLlmApiKey] = useState(settings.llm_api_key || "");
  const [llmModel, setLlmModel] = useState(settings.llm_model || "gpt-4o-mini");
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [savingLlm, setSavingLlm] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);

  // SMTP
  const [smtpHost, setSmtpHost] = useState(settings.smtp_host || "");
  const [smtpPort, setSmtpPort] = useState(settings.smtp_port || "587");
  const [smtpUser, setSmtpUser] = useState(settings.smtp_user || "");
  const [smtpPassword, setSmtpPassword] = useState(settings.smtp_password || "");
  const [smtpSecure, setSmtpSecure] = useState(settings.smtp_secure || "false");
  const [smtpFrom, setSmtpFrom] = useState(settings.smtp_from || "");
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);

  // Retention
  const [retention, setRetention] = useState(settings.email_retention_days || "30");
  const [savingRetention, setSavingRetention] = useState(false);

  // Worker
  const [workerSecret, setWorkerSecret] = useState(settings.worker_secret || "");
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  async function saveSettings(key: string, value: string, setLoading: (v: boolean) => void) {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      toast({ title: "Tersimpan" });
      router.refresh();
    } catch {
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      toast({ title: "Password baru tidak cocok", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password minimal 6 karakter", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Password berhasil diubah" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSaveLlm() {
    setSavingLlm(true);
    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulk: {
            llm_endpoint: llmEndpoint,
            llm_api_key: llmApiKey,
            llm_model: llmModel,
          },
        }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      toast({ title: "Konfigurasi LLM tersimpan" });
      router.refresh();
    } catch {
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    } finally {
      setSavingLlm(false);
    }
  }

  async function handleSaveSmtp() {
    setSavingSmtp(true);
    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulk: {
            smtp_host: smtpHost,
            smtp_port: smtpPort,
            smtp_user: smtpUser,
            smtp_password: smtpPassword,
            smtp_secure: smtpSecure,
            smtp_from: smtpFrom,
          },
        }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      toast({ title: "Konfigurasi SMTP tersimpan" });
      router.refresh();
    } catch {
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    } finally {
      setSavingSmtp(false);
    }
  }

  async function handleTestLlm() {
    setTestingLlm(true);
    try {
      const res = await fetch("/api/dashboard/settings/test-llm", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Koneksi berhasil", description: `Model: ${data.model}` });
    } catch (err: any) {
      toast({ title: "Koneksi gagal", description: err.message, variant: "destructive" });
    } finally {
      setTestingLlm(false);
    }
  }

  async function regenerateSecret() {
    try {
      const res = await fetch("/api/dashboard/settings/regenerate-secret", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWorkerSecret(data.secret);
      toast({ title: "Secret berhasil di-regenerate" });
      router.refresh();
    } catch {
      toast({ title: "Gagal regenerate", variant: "destructive" });
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Change Password — tersedia untuk semua role */}
      <Card>
        <CardHeader>
          <CardTitle>Ganti Password</CardTitle>
          <CardDescription>Ubah password akun Anda.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm space-y-4">
            <div className="space-y-2">
              <Label>Password Saat Ini</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Password Baru</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Konfirmasi Password Baru</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <Button onClick={handleChangePassword} disabled={savingPassword || !currentPassword || !newPassword}>
              {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ubah Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Konfigurasi platform hanya untuk admin */}
      {isAdmin && (
        <>
      {/* LLM Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Konfigurasi LLM</CardTitle>
          <CardDescription>Pengaturan untuk endpoint OpenAI-compatible yang digunakan untuk generate identitas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-lg space-y-4">
            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input value={llmEndpoint} onChange={(e) => setLlmEndpoint(e.target.value)} placeholder="https://api.openai.com/v1" />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  type={showLlmKey ? "text" : "password"}
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  placeholder="sk-..."
                />
                <Button variant="outline" size="icon" onClick={() => setShowLlmKey(!showLlmKey)}>
                  {showLlmKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input value={llmModel} onChange={(e) => setLlmModel(e.target.value)} placeholder="gpt-4o-mini" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveLlm} disabled={savingLlm}>
                {savingLlm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
              <Button variant="outline" onClick={handleTestLlm} disabled={testingLlm}>
                {testingLlm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tes Koneksi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMTP Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Konfigurasi SMTP</CardTitle>
          <CardDescription>
            Digunakan endpoint <code>/api/reply</code> untuk mengirim email balasan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-lg space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <div className="space-y-2">
                <Label>SMTP Host</Label>
                <Input
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>SMTP User</Label>
              <Input
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>SMTP Password</Label>
              <div className="flex gap-2">
                <Input
                  type={showSmtpPassword ? "text" : "password"}
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                >
                  {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Koneksi</Label>
                <Select value={smtpSecure} onValueChange={setSmtpSecure}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">STARTTLS (biasanya port 587)</SelectItem>
                    <SelectItem value="true">TLS/SSL (biasanya port 465)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alamat Pengirim</Label>
                <Input
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  placeholder="CloudMail <no-reply@example.com>"
                />
              </div>
            </div>
            <Button onClick={handleSaveSmtp} disabled={savingSmtp}>
              {savingSmtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan SMTP
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Retention */}
      <Card>
        <CardHeader>
          <CardTitle>Retensi Email</CardTitle>
          <CardDescription>Berapa lama email disimpan sebelum dihapus otomatis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={retention} onValueChange={setRetention}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 hari</SelectItem>
                <SelectItem value="14">14 hari</SelectItem>
                <SelectItem value="30">30 hari</SelectItem>
                <SelectItem value="60">60 hari</SelectItem>
                <SelectItem value="90">90 hari</SelectItem>
                <SelectItem value="0">Selamanya</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => saveSettings("email_retention_days", retention, setSavingRetention)} disabled={savingRetention}>
              {savingRetention && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Worker Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Konfigurasi Worker</CardTitle>
          <CardDescription>Secret dan URL untuk Cloudflare Email Worker.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Backend URL</Label>
              <div className="flex gap-2">
                <Input value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/internal/ingest`} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(`${window.location.origin}/api/internal/ingest`)}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Worker Secret</Label>
              <div className="flex gap-2">
                <Input type={showSecret ? "text" : "password"} value={workerSecret} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={() => setShowSecret(!showSecret)}>
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(workerSecret)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={regenerateSecret}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
