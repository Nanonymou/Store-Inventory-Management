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
import { ExportButtons } from "@/components/export-buttons";
import { useSession } from "@/components/session-provider";
import { useAsync } from "@/hooks/use-async";
import { apiGet } from "@/lib/api/client";
import { splitStockView, type ApiStockViewRow } from "@/lib/api/types";
import { todayISODate } from "@/lib/date";

/** Dashboard Stok — central monitoring page, backed by /api/dashboard/stock. */
export default function DashboardPage() {
  const today = todayISODate();
  const { activeSite, activeSiteId, sites } = useSession();

  const { data, loading, error, reload } = useAsync(
    () =>
      apiGet<{ rows: ApiStockViewRow[] }>("/api/dashboard/stock", {
        siteId: activeSiteId,
        date: today,
      }),
    [activeSiteId, today],
  );

  const [filters, setFilters] = React.useState<DashboardFilterState>({
    siteId: activeSiteId,
    section: "all",
    query: "",
  });

  React.useEffect(() => {
    setFilters((prev) =>
      prev.siteId === activeSiteId ? prev : { ...prev, siteId: activeSiteId },
    );
  }, [activeSiteId]);

  const { items: allItems, rows: allRows } = React.useMemo(
    () => splitStockView(data?.rows ?? [], activeSiteId, today),
    [data, activeSiteId, today],
  );

  const filteredItems = React.useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return allItems.filter((item) => {
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
  }, [allItems, filters.section, filters.query]);

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
          {activeSite ? `${activeSite.name} · ` : ""}
          {format(new Date(), "EEEE, dd MMMM yyyy", { locale: localeId })}
        </p>
      </header>

      <DashboardFilters
        sites={sites}
        value={filters}
        onChange={setFilters}
        canSwitchSite={false}
        actions={
          <ExportButtons
            items={filteredItems}
            rows={filteredRows}
            meta={{ siteName: activeSite?.name ?? "Site", date: today }}
          />
        }
      />

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error}{" "}
          <button
            type="button"
            onClick={reload}
            className="underline underline-offset-2"
          >
            Coba lagi
          </button>
        </div>
      ) : (
        <>
          <section aria-label="Ringkasan nilai" className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Wallet className="size-4" />
              Ringkasan Nilai
            </div>
            <ValueSummary items={filteredItems} rows={filteredRows} />
          </section>

          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle>Tabel Stok Lengkap</CardTitle>
              <CardDescription>
                {loading
                  ? "Memuat…"
                  : `${activeSite?.name ?? "Site"} · ${filteredItems.length} dari ${allItems.length} item · saldo hari ini`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <StockDashboardTable items={filteredItems} rows={filteredRows} />
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
