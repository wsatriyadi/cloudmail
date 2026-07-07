"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  Globe,
  Inbox,
  Key,
  Settings,
  LogOut,
  Mail,
  AtSign,
  ScrollText,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Beranda", icon: BarChart3 },
  { href: "/dashboard/domains", label: "Domain", icon: Globe },
  { href: "/dashboard/aliases", label: "Alias Email", icon: AtSign },
  { href: "/dashboard/inbox", label: "Kotak Masuk", icon: Inbox },
  { href: "/dashboard/api-keys", label: "Kunci API", icon: Key },
  { href: "/dashboard/users", label: "Pengguna", icon: Users },
  { href: "/dashboard/audit-log", label: "Log Aktivitas", icon: ScrollText },
  { href: "/dashboard/settings", label: "Pengaturan", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar-background text-sidebar-foreground">
      {/* Logo / Brand */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <Mail className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold">CloudMail</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-3">
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="text-sidebar-foreground/70"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Keluar
          </Button>
        </div>
      </div>
    </aside>
  );
}
