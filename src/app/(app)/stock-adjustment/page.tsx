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
import { AdjustmentHistoryTable } from "@/components/adjustment-history-table";
import {
  AdjustmentForm,
  type AdjustmentFormValues,
} from "@/components/adjustment-form";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import {
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

  const [adjustments, setAdjustments] =
    React.useState<StockAdjustment[]>(MOCK_ADJUSTMENTS);
  const [formOpen, setFormOpen] = React.useState(false);

  // Mock current stock: today's computed balance for the item at the site.
  const getCurrentStock = React.useCallback(
    (siteId: string, itemId: string) =>
      computeBalance(mockDailyStockRow(itemId, siteId, todayISODate())),
    [],
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
    setFormOpen(false);
  };

  const sorted = React.useMemo(
    () => [...adjustments].sort((a, b) => b.date.localeCompare(a.date)),
    [adjustments],
  );

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

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Riwayat Penyesuaian</CardTitle>
          <CardDescription>{sorted.length} penyesuaian tercatat</CardDescription>
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
