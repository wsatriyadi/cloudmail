import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { canAccessMenu, normaliseRole, type Role } from "@/lib/roles";

// Satu sumber kebenaran untuk hak akses. Semua route dan halaman dashboard
// memakai modul ini, bukan memeriksa sesi sendiri-sendiri.
export {
  ROLES,
  MAX_RATE_LIMIT,
  CUSTOMER_TOTAL_RPM,
  ROLE_MENUS,
  normaliseRole,
  canAccessMenu,
  rateLimitCapFor,
  canManageDomains,
} from "@/lib/roles";
export type { Role } from "@/lib/roles";

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

// Halaman di luar menu role akan dialihkan ke beranda dashboard.
export async function requireMenuAccess(href: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAccessMenu(user.role, href)) redirect("/dashboard");
  return user;
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
