"use client";

import * as React from "react";
import { ArrowLeftRight, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  TransferHistoryTable,
  type TransferSort,
  type TransferSortKey,
} from "@/components/transfer-history-table";
import {
  TransferFilters,
  EMPTY_TRANSFER_FILTERS,
  type TransferFilterState,
} from "@/components/transfer-filters";
import { TransferForm, type TransferFormValues } from "@/components/transfer-form";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { useSession } from "@/components/session-provider";
import { useAsync } from "@/hooks/use-async";
import { apiGet, apiSend, ApiError } from "@/lib/api/client";
import {
  toMasterItem,
  type ApiMasterItem,
  type ApiTransfer,
} from "@/lib/api/types";
import type { StockTransfer, TransferStatus } from "@/lib/transfer-mock";

/** Stock Transfer (Admin), backed by /api/transfers and /api/master-items. */
export default function StockTransferPage() {
  const isAdmin = useRequireAdmin();
  const { sites } = useSession();
  const { toast } = useToast();

  const transfersReq = useAsync(
    () => apiGet<{ transfers: ApiTransfer[] }>("/api/transfers"),
    [],
  );
  const itemsReq = useAsync(
    () => apiGet<{ items: ApiMasterItem[] }>("/api/master-items"),
    [],
  );

  const [formOpen, setFormOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [filters, setFilters] = React.useState<TransferFilterState>(
    EMPTY_TRANSFER_FILTERS,
  );
  const [sort, setSort] = React.useState<TransferSort>({
    key: "date",
    dir: "desc",
  });

  const allTransfers: StockTransfer[] = React.useMemo(
    () =>
      (transfersReq.data?.transfers ?? []).map((t) => ({
        ...t,
        status: t.status as TransferStatus,
      })),
    [transfersReq.data],
  );

  const items = React.useMemo(
    () => (itemsReq.data?.items ?? []).map(toMasterItem),
    [itemsReq.data],
  );

  const handleSort = (key: TransferSortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );
  };

  const handleCreate = async (values: TransferFormValues) => {
    setSaving(true);
    try {
      await apiSend("POST", "/api/transfers", {
        fromSiteId: values.fromSiteId,
        toSiteId: values.toSiteId,
        itemId: values.itemId,
        quantity: values.quantity,
      });
      toast({ variant: "success", title: "Transfer dibuat (menunggu persetujuan)." });
      setFormOpen(false);
      transfersReq.reload();
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal membuat transfer",
        description: err instanceof ApiError ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const siteNames = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of allTransfers) {
      set.add(t.fromSite);
      set.add(t.toSite);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [allTransfers]);

  const transfers = React.useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const filtered = allTransfers.filter((t) => {
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (
        filters.site !== "all" &&
        t.fromSite !== filters.site &&
        t.toSite !== filters.site
      ) {
        return false;
      }
      if (
        q &&
        !t.itemCode.toLowerCase().includes(q) &&
        !t.itemDescription.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const cmp =
        sort.key === "quantity"
          ? a.quantity - b.quantity
          : a.date.localeCompare(b.date);
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [allTransfers, filters, sort]);

  if (!isAdmin) return null;

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeftRight className="size-4" />
            <span>SIM — Mutasi Antar Site</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Transfer</h1>
          <p className="text-sm text-muted-foreground">
            Pemindahan barang antar lokasi yang menjaga sinkronisasi stok di
            site asal dan tujuan.
          </p>
        </div>
        <Button type="button" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Transfer Baru
        </Button>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-4 border-b pb-4">
          <div className="space-y-1">
            <CardTitle>Riwayat Transfer</CardTitle>
            <CardDescription>
              {transfersReq.loading
                ? "Memuat…"
                : `${transfers.length} dari ${allTransfers.length} mutasi`}
            </CardDescription>
          </div>
          <TransferFilters
            value={filters}
            onChange={setFilters}
            sites={siteNames}
            sort={sort}
            onSortChange={setSort}
          />
        </CardHeader>
        <CardContent className="p-0">
          {transfersReq.error ? (
            <div className="p-6 text-sm text-destructive">
              {transfersReq.error}{" "}
              <button
                type="button"
                onClick={transfersReq.reload}
                className="underline underline-offset-2"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <TransferHistoryTable
              transfers={transfers}
              sort={sort}
              onSort={handleSort}
              isLoading={transfersReq.loading}
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Transfer Baru"
        description="Pindahkan stok dari satu site ke site lain."
      >
        <TransferForm
          sites={sites}
          items={items}
          submitLabel={saving ? "Menyimpan…" : "Buat Transfer"}
          onSubmit={handleCreate}
          onCancel={() => setFormOpen(false)}
        />
      </Dialog>
    </main>
  );
}
