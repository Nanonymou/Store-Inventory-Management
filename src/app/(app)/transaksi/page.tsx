"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Lock, MapPin, PackageSearch, Save, Wallet } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { DailyTransactionTable } from "@/components/daily-transaction-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/components/session-provider";
import { useAsync } from "@/hooks/use-async";
import { apiGet, apiSend, ApiError } from "@/lib/api/client";
import { splitStockView, type ApiStockViewRow } from "@/lib/api/types";
import {
  MOVEMENT_COLUMNS,
  computeBalance,
  type DailyStockMovements,
  type DailyStockRow,
} from "@/lib/types";
import { toISODate, todayISODate } from "@/lib/date";
import { formatRupiah } from "@/lib/utils";

/** Daily transaction page, backed by /api/transactions and /api/daily-stock. */
export default function DailyTransactionPage() {
  const { activeSite, activeSiteId, isAdmin } = useSession();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = React.useState<Date>(() => new Date());
  const [showValue, setShowValue] = React.useState(false);
  const [rows, setRows] = React.useState<DailyStockRow[]>([]);
  const [saving, setSaving] = React.useState(false);

  const isoDate = toISODate(selectedDate);
  const isToday = isoDate === todayISODate();

  const { data, loading, error, reload } = useAsync(
    () =>
      apiGet<{ rows: ApiStockViewRow[]; editable: boolean }>(
        "/api/transactions",
        { siteId: activeSiteId, date: isoDate },
      ),
    [activeSiteId, isoDate],
  );

  const { items } = React.useMemo(
    () => splitStockView(data?.rows ?? [], activeSiteId, isoDate),
    [data, activeSiteId, isoDate],
  );

  // Load the fetched rows into editable local state whenever they change.
  React.useEffect(() => {
    if (data) {
      const split = splitStockView(data.rows, activeSiteId, isoDate);
      setRows(split.rows);
    }
  }, [data, activeSiteId, isoDate]);

  const apiEditable = data?.editable ?? false;
  const editable = apiEditable && !showValue;

  const handleCellChange = React.useCallback(
    (itemId: string, key: keyof DailyStockMovements, value: number) => {
      setRows((prev) =>
        prev.map((r) => (r.itemId === itemId ? { ...r, [key]: value } : r)),
      );
    },
    [],
  );

  const totalStockValue = React.useMemo(() => {
    const priceByItem = new Map(items.map((i) => [i.id, i.price]));
    return rows.reduce(
      (sum, r) => sum + computeBalance(r) * (priceByItem.get(r.itemId) ?? 0),
      0,
    );
  }, [items, rows]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = rows.map((r) => {
        const movements = {} as DailyStockMovements;
        for (const col of MOVEMENT_COLUMNS) movements[col.key] = r[col.key];
        return { itemId: r.itemId, ...movements };
      });
      const res = await apiSend<{ created: number; revised: number }>(
        "POST",
        "/api/daily-stock",
        { siteId: activeSiteId, date: isoDate, entries },
      );
      toast({
        variant: "success",
        title: "Transaksi tersimpan",
        description: `${res.created} entri baru, ${res.revised} revisi.`,
      });
      reload();
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal menyimpan",
        description: err instanceof ApiError ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PackageSearch className="size-4" />
            <span>SIM — Transaksi Harian</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Catat Transaksi Harian
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            {activeSite?.name ?? "—"}
            {activeSite && (
              <span className="text-muted-foreground/60">
                · {activeSite.location}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col items-start gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Tanggal rekap
            </span>
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              disableFuture={!isAdmin}
            />
            {editable ? (
              <span className="text-xs text-emerald-600">
                Mode input aktif.
                {isAdmin && !isToday && " (Admin — semua tanggal)"}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <Lock className="size-3" />
                {isAdmin || isToday
                  ? "Mode lihat."
                  : "Tanggal lampau — hanya bisa dilihat."}
              </span>
            )}
          </div>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Rekap Stok</CardTitle>
            <CardDescription>
              {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: localeId })}{" "}
              · {loading ? "memuat…" : `${items.length} item`} · Balance
              dihitung otomatis
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
            {apiEditable && (
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={handleSave}
              >
                <Save className="size-4" />
                {saving ? "Menyimpan…" : "Simpan"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6 text-sm text-destructive">
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
            <DailyTransactionTable
              items={items}
              rows={rows}
              editable={editable}
              showValue={showValue}
              onCellChange={handleCellChange}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-xs text-muted-foreground">
          Beginning Balance terisi otomatis dari Balance hari sebelumnya. Balance
          = Beginning Balance + Receiving − Regular − Snack − Backcharge − HKL −
          Event − Ent − TO − Spoil. Nilai Rupiah dihitung dari Price × Qty tiap
          kolom.
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
