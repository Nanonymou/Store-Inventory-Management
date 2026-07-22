"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { MapPin, PackageSearch } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
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

/** Convert a Date to a local ISO date string (YYYY-MM-DD). */
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Daily transaction page. For now it runs entirely on mock data: a Storeman is
 * pinned to a single site and the calendar drives which day's stock is shown.
 * The date picker locks future dates (a Storeman may only view/enter today);
 * the site switching and role logic arrive with the Multi-Site feature.
 */
export default function DailyTransactionPage() {
  // Mock "current user" context: a Storeman bound to the first site.
  const activeSite = MOCK_SITES[0];

  const [selectedDate, setSelectedDate] = React.useState<Date>(() => new Date());

  const isoDate = toISODate(selectedDate);
  const rows = React.useMemo(
    () => mockDailyStockForSite(activeSite.id, isoDate),
    [activeSite.id, isoDate],
  );

  const isToday = isoDate === toISODate(new Date());

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
          {!isToday && (
            <span className="text-xs text-amber-600">
              Menampilkan histori tanggal lampau (mode lihat).
            </span>
          )}
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-1 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Rekap Stok</CardTitle>
            <CardDescription>
              {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: localeId })}{" "}
              · {MOCK_MASTER_ITEMS.length} item · Balance dihitung otomatis
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DailyTransactionTable items={MOCK_MASTER_ITEMS} rows={rows} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Data pada halaman ini masih tiruan (mock) untuk keperluan pengembangan
        antarmuka. Perhitungan Balance memakai rumus baku: Beginning Balance +
        Receiving − Regular − Snack − Backcharge − HKL − Event − Ent − TO −
        Spoil.
      </p>
    </main>
  );
}
