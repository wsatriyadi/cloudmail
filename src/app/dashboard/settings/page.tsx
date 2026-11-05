import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { SettingsForm } from "@/components/settings/settings-form";
import { requireUser } from "@/lib/authz";

async function getSettings() {
  const rows = await db.select().from(settings);
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

export default async function SettingsPage() {
  const user = await requireUser();
  const settingsMap = await getSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground">
          {user.role === "admin" ? "Konfigurasi platform dan preferensi." : "Ubah password akun Anda."}
        </p>
      </div>
      <SettingsForm settings={settingsMap} isAdmin={user.role === "admin"} />
    </div>
  );
}
