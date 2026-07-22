"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { LayoutDashboard, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StockDashboardTable } from "@/components/stock-dashboard-table";
import { ValueSummary } from "@/components/value-summary";
import {
  DashboardFilters,
  type DashboardFilterState,
} from "@/components/dashboard-filters";
import {
  MOCK_MASTER_ITEMS,
  MOCK_SITES,
  mockDailyStockForSite,
} from "@/lib/mock-data";
import { todayISODate } from "@/lib/date";

/**
 * Dashboard Stok — central monitoring page (mock data). Site, section, and
 * keyword filters narrow both the stock table and the value summary in real
 * time.
 */
export default function DashboardPage() {
  const today = todayISODate();

  const [filters, setFilters] = React.useState<DashboardFilterState>({
    siteId: MOCK_SITES[0].id,
    section: "all",
    query: "",
  });

  const activeSite =
    MOCK_SITES.find((s) => s.id === filters.siteId) ?? MOCK_SITES[0];

  // All rows for the selected site (mock).
  const allRows = React.useMemo(
    () => mockDailyStockForSite(filters.siteId, today),
    [filters.siteId, today],
  );

  // Apply section + keyword filters to the item catalog.
  const filteredItems = React.useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return MOCK_MASTER_ITEMS.filter((item) => {
      if (filters.section !== "all" && item.section !== filters.section) {
        return false;
      }
      if (!q) return true;
      return (
        item.itemCode.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.brand ?? "").toLowerCase().includes(q)
      );
    });
  }, [filters.section, filters.query]);

  const filteredRows = React.useMemo(() => {
    const ids = new Set(filteredItems.map((i) => i.id));
    return allRows.filter((r) => ids.has(r.itemId));
  }, [allRows, filteredItems]);

  return (
    <main className="mx-auto flex max-w-[1500px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LayoutDashboard className="size-4" />
          <span>StokMan — Dashboard</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Stok</h1>
        <p className="text-sm text-muted-foreground">
          Pantau seluruh persediaan per site ·{" "}
          {format(new Date(), "EEEE, dd MMMM yyyy", { locale: localeId })}
        </p>
      </header>

      {/* Filters & search. */}
      <DashboardFilters
        sites={MOCK_SITES}
        value={filters}
        onChange={setFilters}
      />

      {/* Value summary. */}
      <section aria-label="Ringkasan nilai" className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Wallet className="size-4" />
          Ringkasan Nilai
        </div>
        <ValueSummary items={filteredItems} rows={filteredRows} />
      </section>

      {/* Main stock table. */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Tabel Stok Lengkap</CardTitle>
          <CardDescription>
            {activeSite.name} · {filteredItems.length} dari{" "}
            {MOCK_MASTER_ITEMS.length} item · saldo hari ini
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <StockDashboardTable items={filteredItems} rows={filteredRows} />
        </CardContent>
      </Card>
    </main>
  );
}
