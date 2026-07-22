"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  LayoutDashboard,
  Package,
  PackageSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard Stok", icon: LayoutDashboard },
  { href: "/transaksi", label: "Transaksi Harian", icon: ClipboardList },
];

/**
 * Application shell: a sidebar of primary navigation (desktop) plus a top bar
 * with a horizontal nav for small screens. Wraps the authenticated pages so
 * they share consistent chrome.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop only. */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Package className="size-6 text-primary" />
          <div className="leading-tight">
            <div className="text-sm font-bold">StokMan</div>
            <div className="text-[11px] text-muted-foreground">
              Store Inventory
            </div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4 text-[11px] text-muted-foreground">
          Data tiruan · pengembangan UI
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — brand + mobile nav. */}
        <header className="flex h-16 items-center justify-between gap-4 border-b px-4 sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <PackageSearch className="size-5 text-primary" />
            <span className="text-sm font-bold">StokMan</span>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto lg:hidden">
            {NAV_ITEMS.map((item) => (
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
          <div className="ml-auto hidden text-xs text-muted-foreground lg:block">
            Store Inventory Management
          </div>
        </header>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
