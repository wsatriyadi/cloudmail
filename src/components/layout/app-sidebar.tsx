"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  BookOpen,
  Globe,
  Inbox,
  Key,
  Settings,
  LogOut,
  Mail,
  AtSign,
  Menu,
  ScrollText,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const navGroups = [
  {
    label: "Ikhtisar",
    items: [{ href: "/dashboard", label: "Beranda", icon: BarChart3 }],
  },
  {
    label: "Email",
    items: [
      { href: "/dashboard/inbox", label: "Kotak Masuk", icon: Inbox },
      { href: "/dashboard/domains", label: "Domain", icon: Globe },
      { href: "/dashboard/aliases", label: "Alias Email", icon: AtSign },
    ],
  },
  {
    label: "Akses",
    items: [
      { href: "/dashboard/api-keys", label: "Kunci API", icon: Key },
      { href: "/dashboard/users", label: "Pengguna", icon: Users },
    ],
  },
  {
    label: "Sistem",
    items: [
      { href: "/dashboard/audit-log", label: "Log Aktivitas", icon: ScrollText },
      { href: "/dashboard/settings", label: "Pengaturan", icon: Settings },
    ],
  },
];

function isItemActive(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <Mail className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
        </span>
        <span className="text-base font-semibold text-foreground">CloudMail</span>
      </div>

      <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isItemActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 sm:min-h-0",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-primary" : "text-muted-foreground"
                        )}
                        aria-hidden="true"
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <Link
          href="/docs"
          onClick={onNavigate}
          className="mb-2 flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground sm:min-h-0"
        >
          <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          Dokumentasi API
        </Link>
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Keluar
          </Button>
        </div>
      </div>
    </>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Route changes must not leave the drawer covering the new page.
  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile top bar — the desktop sidebar is hidden below lg. */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4 lg:hidden">
        <Button
          variant="outline"
          size="icon"
          aria-label="Buka menu navigasi"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="flex items-center gap-2 text-base font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Mail className="h-3.5 w-3.5 text-primary-foreground" aria-hidden="true" />
          </span>
          CloudMail
        </span>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu navigasi"
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi utama"
            className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar-background"
          >
            <Button
              variant="ghost"
              size="icon"
              aria-label="Tutup menu navigasi"
              className="absolute right-2 top-2.5"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar-background lg:flex">
        <SidebarBody />
      </aside>
    </>
  );
}
