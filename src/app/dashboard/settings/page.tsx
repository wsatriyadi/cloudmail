import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { SettingsForm } from "@/components/settings/settings-form";

function getSettings() {
  const rows = db.select().from(settings).all();
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

export default function SettingsPage() {
  const settingsMap = getSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground">
          Konfigurasi platform dan preferensi.
        </p>
      </div>
      <SettingsForm settings={settingsMap} />
    </div>
  );
}
