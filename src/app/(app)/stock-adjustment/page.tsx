"use client";

import * as React from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Search, X } from "lucide-react";
import { AdjustmentHistoryTable } from "@/components/adjustment-history-table";
import {
  AdjustmentForm,
  type AdjustmentFormValues,
} from "@/components/adjustment-form";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import {
  ADJUSTMENT_REASONS,
  MOCK_ADJUSTMENTS,
  type StockAdjustment,
} from "@/lib/adjustment-mock";
import {
  MOCK_MASTER_ITEMS,
  MOCK_SITES,
  mockDailyStockRow,
} from "@/lib/mock-data";
import { computeBalance } from "@/lib/types";
import { todayISODate } from "@/lib/date";

/**
 * Stock Adjustment / opname (Admin only). Records a corrected physical count and
 * reason; the history keeps before/after values for audit. Mock data for now.
 */
export default function StockAdjustmentPage() {
  const isAdmin = useRequireAdmin();
  const { toast } = useToast();

  const [adjustments, setAdjustments] =
    React.useState<StockAdjustment[]>(MOCK_ADJUSTMENTS);
  const [formOpen, setFormOpen] = React.useState(false);
  const [siteFilter, setSiteFilter] = React.useState("all");
  const [reasonFilter, setReasonFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  // Local applied-stock overrides so an adjustment takes effect immediately:
  // once saved, the current stock for that (site, item) reflects the new value.
  const [applied, setApplied] = React.useState<Record<string, number>>({});

  const stockKey = (siteId: string, itemId: string) => `${siteId}:${itemId}`;

  // Current stock = last applied value if any, else today's mock balance.
  const getCurrentStock = React.useCallback(
    (siteId: string, itemId: string) => {
      const key = stockKey(siteId, itemId);
      if (key in applied) return applied[key];
      return computeBalance(mockDailyStockRow(itemId, siteId, todayISODate()));
    },
    [applied],
  );

  const handleCreate = (values: AdjustmentFormValues) => {
    const site = MOCK_SITES.find((s) => s.id === values.siteId);
    const item = MOCK_MASTER_ITEMS.find((i) => i.id === values.itemId);
    if (!site || !item) return;

    const before = getCurrentStock(values.siteId, values.itemId);
    const adjustment: StockAdjustment = {
      id: `adj-${Date.now()}`,
      date: todayISODate(),
      site: site.name,
      itemCode: item.itemCode,
      itemDescription: item.description,
      before,
      after: values.physicalCount,
      reason: values.reason,
      note: values.note,
      adjustedBy: "Admin Pusat",
    };
    setAdjustments((prev) => [adjustment, ...prev]);
    // Apply immediately: the current stock for this (site, item) now reflects
    // the counted physical value, so reopening the form shows the new "before".
    setApplied((prev) => ({
      ...prev,
      [stockKey(values.siteId, values.itemId)]: values.physicalCount,
    }));
    setFormOpen(false);

    const diff = adjustment.after - adjustment.before;
    toast({
      variant: "success",
      title: "Penyesuaian tersimpan",
      description: `${item.itemCode} di ${site.name}: ${before} → ${values.physicalCount} (${diff > 0 ? `+${diff}` : diff}).`,
    });
  };

  // Distinct sites present in the history, for the site filter.
  const siteOptions = React.useMemo(() => {
    const set = new Set(adjustments.map((a) => a.site));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [adjustments]);

  const sorted = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...adjustments]
      .filter((a) => {
        if (siteFilter !== "all" && a.site !== siteFilter) return false;
        if (reasonFilter !== "all" && a.reason !== reasonFilter) return false;
        if (
          q &&
          !a.itemCode.toLowerCase().includes(q) &&
          !a.itemDescription.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [adjustments, siteFilter, reasonFilter, query]);

  const hasFilter =
    siteFilter !== "all" || reasonFilter !== "all" || query.trim() !== "";

  // Applied stock changes, resolved to readable site/item labels for display.
  const appliedRows = React.useMemo(() => {
    return Object.entries(applied).map(([key, value]) => {
      const [siteId, itemId] = key.split(":");
      const site = MOCK_SITES.find((s) => s.id === siteId);
      const item = MOCK_MASTER_ITEMS.find((i) => i.id === itemId);
      return {
        key,
        siteName: site?.name ?? siteId,
        itemLabel: item ? `${item.itemCode} — ${item.description}` : itemId,
        current: value,
      };
    });
  }, [applied]);

  if (!isAdmin) return null;

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="size-4" />
            <span>StokMan — Penyesuaian Stok</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Adjustment</h1>
          <p className="text-sm text-muted-foreground">
            Selaraskan catatan sistem dengan jumlah fisik saat terjadi selisih
            hasil opname.
          </p>
        </div>
        <Button type="button" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Penyesuaian Baru
        </Button>
      </header>

      {appliedRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Stok Terkini Setelah Penyesuaian
            </CardTitle>
            <CardDescription>
              Perubahan diterapkan langsung (state lokal).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {appliedRows.map((r) => (
              <div
                key={r.key}
                className="rounded-lg border bg-emerald-500/5 px-3 py-2 text-sm"
              >
                <div className="text-xs text-muted-foreground">
                  {r.siteName} · {r.itemLabel}
                </div>
                <div className="font-semibold tabular-nums">
                  Stok terkini: {r.current}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-4 border-b pb-4">
          <div className="space-y-1">
            <CardTitle>Riwayat Penyesuaian</CardTitle>
            <CardDescription>
              {sorted.length} dari {adjustments.length} penyesuaian
            </CardDescription>
          </div>
          <div className="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label>Site</Label>
              <Select
                value={siteFilter}
                onValueChange={setSiteFilter}
                options={[
                  { value: "all", label: "Semua Site" },
                  ...siteOptions.map((s) => ({ value: s, label: s })),
                ]}
                className="w-full sm:w-[170px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Alasan</Label>
              <Select
                value={reasonFilter}
                onValueChange={setReasonFilter}
                options={[
                  { value: "all", label: "Semua Alasan" },
                  ...ADJUSTMENT_REASONS.map((r) => ({ value: r, label: r })),
                ]}
                className="w-full sm:w-[180px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Pencarian</Label>
              <div className="relative w-full sm:w-[220px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Item code / deskripsi…"
                  className="pl-8"
                />
              </div>
            </div>
            {hasFilter && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSiteFilter("all");
                  setReasonFilter("all");
                  setQuery("");
                }}
              >
                <X className="size-4" />
                Reset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <AdjustmentHistoryTable adjustments={sorted} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Data pada halaman ini masih tiruan (mock) — penyesuaian baru tersimpan di
        sesi browser saja hingga backend tersambung.
      </p>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Penyesuaian Stok"
        description="Catat jumlah fisik hasil opname dan alasan penyesuaian."
      >
        <AdjustmentForm
          sites={MOCK_SITES}
          items={MOCK_MASTER_ITEMS}
          getCurrentStock={getCurrentStock}
          submitLabel="Simpan Penyesuaian"
          onSubmit={handleCreate}
          onCancel={() => setFormOpen(false)}
        />
      </Dialog>
    </main>
  );
}
