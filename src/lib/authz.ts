import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

// Satu sumber kebenaran untuk hak akses. Semua route dan halaman dashboard
// memakai modul ini, bukan memeriksa sesi sendiri-sendiri.
export type Role = "admin" | "pelanggan" | "viewer" | "api-only";

export const ROLES: Role[] = ["admin", "pelanggan", "viewer", "api-only"];

// Batas rate limit yang boleh dibuat per role. null = tanpa batas khusus.
export const MAX_RATE_LIMIT: Record<Role, number | null> = {
  admin: null,
  pelanggan: 500,
  viewer: null,
  "api-only": null,
};

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export function isAdmin(user: SessionUser | null | undefined): boolean {
  return user?.role === "admin";
}

// Pelanggan hanya melihat data miliknya. Admin melihat semuanya.
export function ownsAllData(user: SessionUser): boolean {
  return isAdmin(user);
}

// Role tidak dikenal diperlakukan sebagai hak paling rendah.
export function normaliseRole(value: string | null | undefined): Role {
  return ROLES.includes(value as Role) ? (value as Role) : "api-only";
}

export function rateLimitCapFor(role: Role): number | null {
  return MAX_RATE_LIMIT[role];
}

// Dipakai di halaman dashboard (server component).
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: normaliseRole(session.user.role),
  };
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/dashboard");
  return user;
}

// Dipakai di route API. Mengembalikan null bila sesi tidak valid.
export async function sessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: normaliseRole(session.user.role),
  };
}
