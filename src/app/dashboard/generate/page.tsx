import { IdentityGenerator } from "@/components/generate/identity-generator";
import { requireUser } from "@/lib/authz";

export default async function GeneratePage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Generate Identitas</h1>
        <p className="text-muted-foreground">
          Buat identitas sementara lengkap dengan alamat email. Alamat yang dihasilkan
          tercatat milik akun Anda dan bisa dibaca di Kotak Masuk.
        </p>
      </div>
      <IdentityGenerator />
    </div>
  );
}
