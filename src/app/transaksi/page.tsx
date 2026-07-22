"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Lock, MapPin, PackageSearch, ShieldCheck, User, Wallet } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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
import { MOCK_ADMIN, MOCK_STOREMAN } from "@/lib/mock-session";
import {
  computeBalance,
  type DailyStockMovements,
  type DailyStockRow,
  type SessionUser,
} from "@/lib/types";
import { cn, formatRupiah } from "@/lib/utils";

/** Convert a Date to a local ISO date string (YYYY-MM-DD). */
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Daily transaction page (mock data). Enforces the date-lock and role rules on
 * the UI:
 *   - Storeman: pinned to their bound site, may only edit today (past dates are
 *     viewable but read-only), no site switcher.
 *   - Admin: may switch across all 11 sites and edit any non-future date.
 * A demo role switcher lets you preview both experiences before real auth lands.
 */
export default function DailyTransactionPage() {
  const [user, setUser] = React.useState<SessionUser>(MOCK_STOREMAN);
  const isAdmin = user.role === "admin";

  // Selected site: Admin chooses; Storeman is fixed to their bound site.
  const [adminSiteId, setAdminSiteId] = React.useState<string>(MOCK_SITES[0].id);
  const activeSiteId = isAdmin ? adminSiteId : (user.siteId ?? MOCK_SITES[0].id);
  const activeSite =
    MOCK_SITES.find((s) => s.id === activeSiteId) ?? MOCK_SITES[0];

  const [selectedDate, setSelectedDate] = React.useState<Date>(() => new Date());
  const [showValue, setShowValue] = React.useState(false);
  const [rows, setRows] = React.useState<DailyStockRow[]>([]);

  const isoDate = toISODate(selectedDate);
  const isToday = isoDate === toISODate(new Date());

  // When switching to a Storeman, snap the calendar back to today (they cannot
  // linger in an editable past view).
  React.useEffect(() => {
    if (!isAdmin) setSelectedDate(new Date());
  }, [isAdmin]);

  // (Re)load the day's rows from mock whenever the date or site changes.
  React.useEffect(() => {
    setRows(mockDailyStockForSite(activeSiteId, isoDate));
  }, [activeSiteId, isoDate]);

  // Editable when: Admin (any non-future date) or Storeman on today only.
  const editable = (isAdmin || isToday) && !showValue;

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
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PackageSearch className="size-4" />
            <span>StokMan — Transaksi Harian</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Catat Transaksi Harian
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {activeSite.name}
              <span className="text-muted-foreground/60">
                · {activeSite.location}
              </span>
            </span>
            <RoleBadge role={user.role} name={user.name} />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {/* Site switcher — Admin only. */}
          {isAdmin && (
            <div className="flex flex-col items-start gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Pilih Site
              </span>
              <Select
                value={adminSiteId}
                onValueChange={setAdminSiteId}
                options={MOCK_SITES.map((s) => ({
                  value: s.id,
                  label: `${s.name} — ${s.location}`,
                }))}
                className="w-[240px]"
              />
            </div>
          )}

          {/* Date picker — future locked; Storeman is pinned to today. */}
          <div className="flex flex-col items-start gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Tanggal rekap
            </span>
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              disableFuture
              disabled={!isAdmin}
            />
            {editable ? (
              <span className="text-xs text-emerald-600">
                Mode input aktif.
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <Lock className="size-3" />
                {isAdmin
                  ? "Mode lihat."
                  : "Storeman terkunci pada hari ini · tanggal lampau hanya bisa dilihat."}
              </span>
            )}
          </div>

          {/* Demo role switcher (temporary until real auth). */}
          <div className="flex flex-col items-start gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Mode (demo)
            </span>
            <Select
              value={user.role}
              onValueChange={(v) =>
                setUser(v === "admin" ? MOCK_ADMIN : MOCK_STOREMAN)
              }
              options={[
                { value: "storeman", label: "Storeman" },
                { value: "admin", label: "Admin" },
              ]}
              className="w-[140px]"
            />
          </div>
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
            editable={editable}
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

/** Small role indicator chip in the page header. */
function RoleBadge({ role, name }: { role: SessionUser["role"]; name: string }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
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
      {name}
    </span>
  );
}
