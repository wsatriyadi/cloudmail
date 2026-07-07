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

export function SettingsForm({ settings }: { settings: Record<string, string> }) {
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
      {/* Platform Name */}
      <Card>
        <CardHeader>
          <CardTitle>Platform</CardTitle>
          <CardDescription>Nama platform yang ditampilkan di header dan halaman login.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} className="max-w-sm" />
            <Button onClick={() => saveSettings("platform_name", platformName, setSavingPlatform)} disabled={savingPlatform}>
              {savingPlatform && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Ganti Password</CardTitle>
          <CardDescription>Ubah password akun admin Anda.</CardDescription>
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
    </div>
  );
}
