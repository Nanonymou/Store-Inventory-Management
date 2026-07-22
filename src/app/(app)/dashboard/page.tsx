"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Filter, LayoutDashboard, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StockDashboardTable } from "@/components/stock-dashboard-table";
import { ValueSummary } from "@/components/value-summary";
import { MOCK_MASTER_ITEMS, MOCK_SITES, mockDailyStockForSite } from "@/lib/mock-data";
import { todayISODate } from "@/lib/date";

/**
 * Dashboard Stok — the central monitoring page. This step lays out the page
 * structure: a header, a summary region, a filter/toolbar region, and the main
 * stock-table region. Each region is filled out by the following steps
 * (value summary, filters & search, export). The base stock table renders on
 * mock data so the layout can be reviewed end to end.
 */
export default function DashboardPage() {
  const activeSite = MOCK_SITES[0];
  const today = todayISODate();
  const rows = React.useMemo(
    () => mockDailyStockForSite(activeSite.id, today),
    [activeSite.id, today],
  );

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

      {/* Region: value summary (populated by the "Ringkasan Nilai" step). */}
      <section aria-label="Ringkasan nilai" className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Wallet className="size-4" />
          Ringkasan Nilai
        </div>
        <ValueSummary items={MOCK_MASTER_ITEMS} rows={rows} />
      </section>

      {/* Region: filters & search (populated by the "Filter & Pencarian" step). */}
      <section aria-label="Filter dan pencarian" className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="size-4" />
          Filter &amp; Pencarian
        </div>
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Filter site, filter seksi barang, pencarian kata kunci, dan tombol
            export akan ditambahkan di sini.
          </CardContent>
        </Card>
      </section>

      {/* Region: the main stock table. */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Tabel Stok Lengkap</CardTitle>
          <CardDescription>
            {activeSite.name} · {MOCK_MASTER_ITEMS.length} item · saldo hari ini
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <StockDashboardTable items={MOCK_MASTER_ITEMS} rows={rows} />
        </CardContent>
      </Card>
    </main>
  );
}
