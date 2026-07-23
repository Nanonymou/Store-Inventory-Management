"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { LayoutDashboard, Sigma, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StockDashboardTable } from "@/components/stock-dashboard-table";
import { ValueSummary } from "@/components/value-summary";
import { SectionValueMatrix } from "@/components/section-value-matrix";
import {
  DashboardFilters,
  type DashboardFilterState,
} from "@/components/dashboard-filters";
import { ExportButtons } from "@/components/export-buttons";
import { DatePicker } from "@/components/ui/date-picker";
import { useSession } from "@/components/session-provider";
import { useAsync } from "@/hooks/use-async";
import { apiGet } from "@/lib/api/client";
import { splitStockView, type ApiStockViewRow } from "@/lib/api/types";
import { toISODate, todayISODate } from "@/lib/date";

/** Dashboard Stok — central monitoring page, backed by /api/dashboard/stock. */
export default function DashboardPage() {
  const { activeSite, activeSiteId, sites } = useSession();

  const [selectedDate, setSelectedDate] = React.useState<Date>(() => new Date());
  const isoDate = toISODate(selectedDate);
  const isToday = isoDate === todayISODate();

  const { data, loading, error, reload } = useAsync(
    () =>
      apiGet<{ rows: ApiStockViewRow[] }>("/api/dashboard/stock", {
        siteId: activeSiteId,
        date: isoDate,
      }),
    [activeSiteId, isoDate],
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
    () => splitStockView(data?.rows ?? [], activeSiteId, isoDate),
    [data, activeSiteId, isoDate],
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
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LayoutDashboard className="size-4" />
            <span>SIM — Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Stok</h1>
          <p className="text-sm text-muted-foreground">
            {activeSite ? `${activeSite.name} · ` : ""}
            {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: localeId })}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Tanggal rekap
          </span>
          <DatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            disableFuture
          />
          {!isToday && (
            <span className="text-xs text-amber-600">
              Menampilkan rekap tanggal lampau.
            </span>
          )}
        </div>
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
            meta={{ siteName: activeSite?.name ?? "Site", date: isoDate }}
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
              <CardTitle className="flex items-center gap-2">
                <Sigma className="size-4" />
                Resume Nilai per Klasifikasi
              </CardTitle>
              <CardDescription>
                Total nilai (Rp) tiap seksi menurut arus stok — Beginning
                Balance, Received, Reguler, Snack, dan seterusnya.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <SectionValueMatrix items={filteredItems} rows={filteredRows} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle>Tabel Stok Lengkap</CardTitle>
              <CardDescription>
                {loading
                  ? "Memuat…"
                  : `${activeSite?.name ?? "Site"} · ${filteredItems.length} dari ${allItems.length} item · ${isToday ? "saldo hari ini" : format(selectedDate, "dd MMM yyyy", { locale: localeId })}`}
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
