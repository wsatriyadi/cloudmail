// Single source of truth for roles, menu access, and rate limit caps.
// Kept free of server-only imports so client components (sidebar, tables)
// can share the same rules as server routes and pages.

export type Role = "admin" | "pelanggan" | "viewer" | "api-only";

export const ROLES: Role[] = ["admin", "pelanggan", "viewer", "api-only"];

// Batas rate limit yang boleh dibuat per role. null = tanpa batas khusus.
export const MAX_RATE_LIMIT: Record<Role, number | null> = {
  admin: null,
  pelanggan: 1000,
  viewer: null,
  "api-only": null,
};

// Rate limit pelanggan adalah akumulasi semua API key miliknya, bukan per key.
export const CUSTOMER_TOTAL_RPM = MAX_RATE_LIMIT.pelanggan!;

// Menu yang boleh dibuka tiap role. Path yang tidak ada di sini tidak
// ditampilkan di sidebar dan tidak bisa diakses langsung lewat URL.
export const ROLE_MENUS: Record<Role, string[]> = {
  admin: [
    "/dashboard",
    "/dashboard/inbox",
    "/dashboard/domains",
    "/dashboard/aliases",
    "/dashboard/generate",
    "/dashboard/api-keys",
    "/dashboard/users",
    "/dashboard/audit-log",
    "/dashboard/settings",
  ],
  pelanggan: [
    "/dashboard",
    "/dashboard/inbox",
    "/dashboard/domains",
    "/dashboard/aliases",
    "/dashboard/generate",
    "/dashboard/api-keys",
    "/dashboard/settings",
  ],
  viewer: ["/dashboard", "/dashboard/inbox", "/dashboard/aliases", "/dashboard/settings"],
  "api-only": ["/dashboard", "/dashboard/inbox", "/dashboard/api-keys", "/dashboard/settings"],
};

// Role tidak dikenal diperlakukan sebagai hak paling rendah.
export function normaliseRole(value: string | null | undefined): Role {
  return ROLES.includes(value as Role) ? (value as Role) : "api-only";
}

export function canAccessMenu(role: string | null | undefined, href: string): boolean {
  return ROLE_MENUS[normaliseRole(role)].includes(href);
}

export function rateLimitCapFor(role: Role): number | null {
  return MAX_RATE_LIMIT[role];
}

// Hanya admin yang boleh mengubah/menghapus/menyetujui domain.
export function canManageDomains(role: string | null | undefined): boolean {
  return normaliseRole(role) === "admin";
}
