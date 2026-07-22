"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Lock, MapPin, PackageSearch, Wallet } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { DailyTransactionTable } from "@/components/daily-transaction-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MOCK_MASTER_ITEMS,
  MOCK_SITES,
  mockDailyStockForSite,
} from "@/lib/mock-data";
import {
  computeBalance,
  type DailyStockMovements,
  type DailyStockRow,
} from "@/lib/types";
import { formatRupiah } from "@/lib/utils";

/** Convert a Date to a local ISO date string (YYYY-MM-DD). */
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Daily transaction page. Runs on mock data for now: a Storeman is pinned to a
 * single site and the calendar drives which day's stock is shown. Only today is
 * editable (future dates locked, past dates view-only); Balance and the Rupiah
 * value summary recompute live as movement quantities are typed.
 */
export default function DailyTransactionPage() {
  // Mock "current user" context: a Storeman bound to the first site.
  const activeSite = MOCK_SITES[0];

  const [selectedDate, setSelectedDate] = React.useState<Date>(() => new Date());
  const [showValue, setShowValue] = React.useState(false);
  const [rows, setRows] = React.useState<DailyStockRow[]>([]);

  const isoDate = toISODate(selectedDate);
  const isToday = isoDate === toISODate(new Date());

  // (Re)load the day's rows from mock whenever the date or site changes.
  React.useEffect(() => {
    setRows(mockDailyStockForSite(activeSite.id, isoDate));
  }, [activeSite.id, isoDate]);

  const handleCellChange = React.useCallback(
    (itemId: string, key: keyof DailyStockMovements, value: number) => {
      setRows((prev) =>
        prev.map((r) => (r.itemId === itemId ? { ...r, [key]: value } : r)),
      );
    },
    [],
  );

  // Live grand total of stock value (Balance × Price) across all items.
  const totalStockValue = React.useMemo(() => {
    const priceByItem = new Map(MOCK_MASTER_ITEMS.map((i) => [i.id, i.price]));
    return rows.reduce(
      (sum, r) => sum + computeBalance(r) * (priceByItem.get(r.itemId) ?? 0),
      0,
    );
  }, [rows]);

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PackageSearch className="size-4" />
            <span>StokMan — Transaksi Harian</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Catat Transaksi Harian
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            {activeSite.name}
            <span className="text-muted-foreground/60">
              · {activeSite.location}
            </span>
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
          {isToday ? (
            <span className="text-xs text-emerald-600">
              Mode input — hanya tanggal hari ini yang bisa diisi.
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <Lock className="size-3" />
              Tanggal lampau terkunci (mode lihat).
            </span>
          )}
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Rekap Stok</CardTitle>
            <CardDescription>
              {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: localeId })}{" "}
              · {MOCK_MASTER_ITEMS.length} item · Balance dihitung otomatis
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={showValue ? "default" : "outline"}
              size="sm"
              onClick={() => setShowValue((v) => !v)}
            >
              <Wallet className="size-4" />
              {showValue ? "Tampilkan Qty" : "Tampilkan Nilai (Rp)"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DailyTransactionTable
            items={MOCK_MASTER_ITEMS}
            rows={rows}
            editable={isToday && !showValue}
            showValue={showValue}
            onCellChange={handleCellChange}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-xs text-muted-foreground">
          Data pada halaman ini masih tiruan (mock) untuk pengembangan
          antarmuka. Beginning Balance terisi otomatis dari Balance hari
          sebelumnya. Balance = Beginning Balance + Receiving − Regular − Snack −
          Backcharge − HKL − Event − Ent − TO − Spoil. Nilai Rupiah dihitung
          otomatis dari Price × Qty tiap kolom.
        </p>
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-right">
          <div className="text-xs text-muted-foreground">
            Total Nilai Persediaan (Balance × Price)
          </div>
          <div className="text-lg font-bold tabular-nums">
            {formatRupiah(totalStockValue)}
          </div>
        </div>
      </div>
    </main>
  );
}
