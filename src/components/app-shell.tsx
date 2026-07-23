"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Boxes,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPin,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useSession } from "@/components/session-provider";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

/** Everyday operational pages. */
const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard Stok", icon: LayoutDashboard },
  { href: "/transaksi", label: "Transaksi Harian", icon: ClipboardList },
];

/** Admin-only administration pages (grouped under a section heading). */
const ADMIN_NAV: NavItem[] = [
  { href: "/master-item", label: "Master Item", icon: Boxes, adminOnly: true },
  {
    href: "/stock-transfer",
    label: "Stock Transfer",
    icon: ArrowLeftRight,
    adminOnly: true,
  },
  {
    href: "/stock-adjustment",
    label: "Stock Adjustment",
    icon: SlidersHorizontal,
    adminOnly: true,
  },
  { href: "/users", label: "Pengguna", icon: Users, adminOnly: true },
  {
    href: "/sites",
    label: "Kelola Lokasi",
    icon: Building2,
    adminOnly: true,
  },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText, adminOnly: true },
];

/**
 * Application shell: a sidebar of primary navigation (desktop) plus a top bar
 * with the active-site picker, the signed-in user, and logout. Admin-only nav
 * entries are hidden from Storemen.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, sites, activeSiteId, setActiveSiteId, isAdmin, logout } =
    useSession();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const adminNav = isAdmin ? ADMIN_NAV : [];
  // Flat list for the mobile top nav.
  const mobileNav = [...MAIN_NAV, ...adminNav];

  const navLinkClass = (href: string) =>
    cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
      isActive(href)
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop only. */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Logo className="size-7" />
          <div className="leading-tight">
            <div className="text-sm font-bold">SIM</div>
            <div className="text-[11px] text-muted-foreground">
              Store Inventory Management
            </div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {MAIN_NAV.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}

          {adminNav.length > 0 && (
            <>
              <div className="mt-4 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                Administrasi
              </div>
              {adminNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navLinkClass(item.href)}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>
        <div className="border-t p-4 text-[11px] text-muted-foreground">
          Data tiruan · pengembangan UI
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — brand, mobile nav, site picker, user, logout. */}
        <header className="flex h-16 items-center gap-4 border-b px-4 sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo className="size-6" />
            <span className="text-sm font-bold">SIM</span>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto lg:hidden">
            {mobileNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {/* Active-site picker. */}
            <div className="flex items-center gap-1.5">
              <MapPin className="hidden size-4 text-muted-foreground sm:block" />
              {isAdmin ? (
                <Select
                  value={activeSiteId}
                  onValueChange={setActiveSiteId}
                  options={sites.map((s) => ({
                    value: s.id,
                    label: `${s.name} — ${s.location}`,
                  }))}
                  className="w-[150px] sm:w-[220px]"
                />
              ) : (
                <span className="text-sm font-medium">
                  {sites[0]?.name ?? "—"}
                </span>
              )}
            </div>

            {/* User chip → profile / change password. */}
            <Link
              href="/profile"
              title="Profil & ubah password"
              className={cn(
                "hidden items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-opacity hover:opacity-80 sm:inline-flex",
                isAdmin
                  ? "bg-primary/10 text-primary"
                  : "bg-emerald-500/10 text-emerald-700",
              )}
            >
              {isAdmin ? (
                <ShieldCheck className="size-3" />
              ) : (
                <User className="size-3" />
              )}
              {user.name}
            </Link>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => logout()}
              aria-label="Keluar"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </header>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
