import type { Metadata } from "next";
import { DocsContent } from "@/components/docs/docs-content";

export const metadata: Metadata = {
  title: "Dokumentasi API",
  description:
    "Panduan lengkap CloudMail REST API: generate identitas, kelola inbox, buat alias email. Otentikasi dengan API key, rate limit 100/menit.",
};

export default function DocsPage() {
  return <DocsContent />;
}
