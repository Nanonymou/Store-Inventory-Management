"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Building2, LayoutDashboard, MapPin, Sigma, Wallet } from "lucide-react";
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
import { MOVEMENT_COLUMNS } from "@/lib/types";
import { toISODate, todayISODate } from "@/lib/date";

/** Movement keys that represent real activity (exclude the carried-over Beg. Balance). */
const ACTIVITY_KEYS = MOVEMENT_COLUMNS.filter((c) => !c.auto).map((c) => c.key);

/** The site a Storeman is bound to, or the aggregate flag for an Admin. */
type DashboardScope = "site" | "all";

/** Dashboard Stok — central monitoring page, backed by /api/dashboard/stock. */
export default function DashboardPage() {
  const { activeSite, activeSiteId, sites, isAdmin } = useSession();

  const [selectedDate, setSelectedDate] = React.useState<Date>(() => new Date());
  const isoDate = toISODate(selectedDate);
  const isToday = isoDate === todayISODate();

  // Admins can flip between the active site and an all-locations aggregate.
  const [scope, setScope] = React.useState<DashboardScope>("site");
  const isAll = isAdmin && scope === "all";
  // Synthetic site key for splitStockView's row ids when aggregating.
  const scopeSiteId = isAll ? "all" : activeSiteId;

  const { data, loading, error, reload } = useAsync(
    () =>
      isAll
        ? apiGet<{ rows: ApiStockViewRow[] }>("/api/dashboard/stock/all", {
            date: isoDate,
          })
        : apiGet<{ rows: ApiStockViewRow[] }>("/api/dashboard/stock", {
            siteId: activeSiteId,
            date: isoDate,
          }),
    [isAll, activeSiteId, isoDate],
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
    () => splitStockView(data?.rows ?? [], scopeSiteId, isoDate),
    [data, scopeSiteId, isoDate],
  );

  const scopeLabel = isAll ? "Semua Lokasi" : (activeSite?.name ?? "Site");

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

  // The "Tabel Stok" lists only items that actually moved on the selected date:
  // any recorded inflow/outflow (Receiving … Spoil). A carried-over Beginning
  // Balance with no transaction is not activity, so standing stock is hidden.
  const movedRows = React.useMemo(
    () => filteredRows.filter((r) => ACTIVITY_KEYS.some((k) => r[k] > 0)),
    [filteredRows],
  );
  const movedItems = React.useMemo(() => {
    const ids = new Set(movedRows.map((r) => r.itemId));
    return filteredItems.filter((i) => ids.has(i.id));
  }, [filteredItems, movedRows]);

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
            {`${scopeLabel} · `}
            {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: localeId })}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
          {isAdmin && (
            <div className="flex flex-col items-start gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Cakupan
              </span>
              <div className="inline-flex rounded-md border p-0.5">
                <button
                  type="button"
                  onClick={() => setScope("site")}
                  className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    !isAll
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <MapPin className="size-3.5" />
                  {activeSite?.name ?? "Site ini"}
                </button>
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    isAll
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <Building2 className="size-3.5" />
                  Semua Lokasi
                </button>
              </div>
            </div>
          )}
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
            meta={{ siteName: scopeLabel, date: isoDate }}
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
              <CardTitle>Tabel Stok — Item Bergerak</CardTitle>
              <CardDescription>
                {loading
                  ? "Memuat…"
                  : `${scopeLabel} · ${movedItems.length} item bergerak dari ${filteredItems.length} · ${isToday ? "hari ini" : format(selectedDate, "dd MMM yyyy", { locale: localeId })}`}
                {!loading && (
                  <span className="mt-0.5 block text-xs text-muted-foreground/80">
                    Hanya menampilkan item dengan transaksi (masuk/keluar/
                    perubahan) pada tanggal ini.
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <StockDashboardTable items={movedItems} rows={movedRows} />
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
