"use client";

import * as React from "react";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
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
import {
  AdjustmentHistoryTable,
  type AdjustmentSort,
  type AdjustmentSortKey,
} from "@/components/adjustment-history-table";
import {
  AdjustmentForm,
  type AdjustmentFormValues,
} from "@/components/adjustment-form";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { useSession } from "@/components/session-provider";
import { useAsync } from "@/hooks/use-async";
import { apiGet, apiSend, ApiError } from "@/lib/api/client";
import {
  toMasterItem,
  type ApiAdjustment,
  type ApiMasterItem,
} from "@/lib/api/types";
import {
  ADJUSTMENT_REASONS,
  adjustmentDifference,
  type AdjustmentReason,
  type StockAdjustment,
} from "@/lib/adjustment-mock";

/** Stock Adjustment (Admin), backed by /api/adjustments and /api/master-items. */
export default function StockAdjustmentPage() {
  const isAdmin = useRequireAdmin();
  const { sites } = useSession();
  const { toast } = useToast();

  const adjReq = useAsync(
    () => apiGet<{ adjustments: ApiAdjustment[] }>("/api/adjustments"),
    [],
  );
  const itemsReq = useAsync(
    () => apiGet<{ items: ApiMasterItem[] }>("/api/master-items"),
    [],
  );

  const [formOpen, setFormOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [siteFilter, setSiteFilter] = React.useState("all");
  const [reasonFilter, setReasonFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<AdjustmentSort>({
    key: "date",
    dir: "desc",
  });

  const items = React.useMemo(
    () => (itemsReq.data?.items ?? []).map(toMasterItem),
    [itemsReq.data],
  );

  const allAdjustments: StockAdjustment[] = React.useMemo(
    () =>
      (adjReq.data?.adjustments ?? []).map((a) => ({
        ...a,
        reason: a.reason as AdjustmentReason,
      })),
    [adjReq.data],
  );

  const handleCreate = async (values: AdjustmentFormValues) => {
    setSaving(true);
    try {
      const res = await apiSend<{ before: number; after: number }>(
        "POST",
        "/api/adjustments",
        {
          siteId: values.siteId,
          itemId: values.itemId,
          physicalCount: values.physicalCount,
          reason: values.reason,
          note: values.note,
        },
      );
      const diff = res.after - res.before;
      toast({
        variant: "success",
        title: "Penyesuaian tersimpan",
        description: `Stok: ${res.before} → ${res.after} (${diff > 0 ? `+${diff}` : diff}).`,
      });
      setFormOpen(false);
      adjReq.reload();
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal menyimpan penyesuaian",
        description: err instanceof ApiError ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSort = (key: AdjustmentSortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );
  };

  const siteOptions = React.useMemo(() => {
    const set = new Set(allAdjustments.map((a) => a.site));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [allAdjustments]);

  const sorted = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...allAdjustments]
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
      .sort((a, b) => {
        const cmp =
          sort.key === "difference"
            ? adjustmentDifference(a) - adjustmentDifference(b)
            : a.date.localeCompare(b.date);
        return sort.dir === "asc" ? cmp : -cmp;
      });
  }, [allAdjustments, siteFilter, reasonFilter, query, sort]);

  const hasFilter =
    siteFilter !== "all" || reasonFilter !== "all" || query.trim() !== "";

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
        <CardHeader className="flex flex-col gap-4 border-b pb-4">
          <div className="space-y-1">
            <CardTitle>Riwayat Penyesuaian</CardTitle>
            <CardDescription>
              {adjReq.loading
                ? "Memuat…"
                : `${sorted.length} dari ${allAdjustments.length} penyesuaian`}
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
          {adjReq.error ? (
            <div className="p-6 text-sm text-destructive">
              {adjReq.error}{" "}
              <button
                type="button"
                onClick={adjReq.reload}
                className="underline underline-offset-2"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <AdjustmentHistoryTable
              adjustments={sorted}
              sort={sort}
              onSort={handleSort}
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Penyesuaian Stok"
        description="Catat jumlah fisik hasil opname dan alasan penyesuaian."
      >
        <AdjustmentForm
          sites={sites}
          items={items}
          submitLabel={saving ? "Menyimpan…" : "Simpan Penyesuaian"}
          onSubmit={handleCreate}
          onCancel={() => setFormOpen(false)}
        />
      </Dialog>
    </main>
  );
}
