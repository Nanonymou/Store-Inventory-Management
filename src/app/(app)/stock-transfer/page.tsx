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
import {
  TransferForm,
  type TransferFormErrors,
  type TransferFormValues,
} from "@/components/transfer-form";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { MOCK_TRANSFERS, type StockTransfer } from "@/lib/transfer-mock";
import {
  MOCK_MASTER_ITEMS,
  MOCK_SITES,
  mockDailyStockRow,
} from "@/lib/mock-data";
import { computeBalance } from "@/lib/types";
import { todayISODate } from "@/lib/date";

/**
 * Stock Transfer (Admin only). Transfer history on mock data with status/site/
 * keyword filters and sorting; the transfer form and stock validation arrive in
 * the following steps.
 */
export default function StockTransferPage() {
  const isAdmin = useRequireAdmin();

  // Local transfer list (mock) so newly created transfers appear immediately.
  const [allTransfers, setAllTransfers] =
    React.useState<StockTransfer[]>(MOCK_TRANSFERS);
  const [formOpen, setFormOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<TransferFilterState>(
    EMPTY_TRANSFER_FILTERS,
  );
  const [sort, setSort] = React.useState<TransferSort>({
    key: "date",
    dir: "desc",
  });

  const handleCreate = (values: TransferFormValues) => {
    const from = MOCK_SITES.find((s) => s.id === values.fromSiteId);
    const to = MOCK_SITES.find((s) => s.id === values.toSiteId);
    const item = MOCK_MASTER_ITEMS.find((i) => i.id === values.itemId);
    if (!from || !to || !item) return;

    const transfer: StockTransfer = {
      id: `tf-${Date.now()}`,
      date: todayISODate(),
      itemCode: item.itemCode,
      itemDescription: item.description,
      fromSite: from.name,
      toSite: to.name,
      quantity: values.quantity,
      status: "pending",
      checkedBy: "—",
    };
    setAllTransfers((prev) => [transfer, ...prev]);
    setFormOpen(false);
  };

  // Mock available stock: today's computed balance for the item at the site.
  const getAvailableStock = React.useCallback(
    (siteId: string, itemId: string) =>
      computeBalance(mockDailyStockRow(itemId, siteId, todayISODate())),
    [],
  );

  // Stock validation: a transfer cannot exceed the origin's available stock.
  const validateStock = React.useCallback(
    (values: TransferFormValues): TransferFormErrors => {
      const available = getAvailableStock(values.fromSiteId, values.itemId);
      if (values.quantity > available) {
        return {
          quantity: `Stok tidak cukup. Tersedia ${available} unit di site asal.`,
        };
      }
      return {};
    },
    [getAvailableStock],
  );

  const handleSort = (key: TransferSortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );
  };

  // Distinct site names (origin or destination) for the site filter.
  const sites = React.useMemo(() => {
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
    const sorted = [...filtered].sort((a, b) => {
      const cmp =
        sort.key === "quantity"
          ? a.quantity - b.quantity
          : a.date.localeCompare(b.date);
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [allTransfers, filters, sort]);

  if (!isAdmin) return null;

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeftRight className="size-4" />
            <span>StokMan — Mutasi Antar Site</span>
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
              {transfers.length} dari {MOCK_TRANSFERS.length} mutasi
            </CardDescription>
          </div>
          <TransferFilters
            value={filters}
            onChange={setFilters}
            sites={sites}
            sort={sort}
            onSortChange={setSort}
          />
        </CardHeader>
        <CardContent className="p-0">
          <TransferHistoryTable
            transfers={transfers}
            sort={sort}
            onSort={handleSort}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Data pada halaman ini masih tiruan (mock) — transfer baru tersimpan di
        sesi browser saja hingga backend tersambung. Jumlah transfer divalidasi
        terhadap stok yang tersedia di site asal.
      </p>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Transfer Baru"
        description="Pindahkan stok dari satu site ke site lain."
      >
        <TransferForm
          sites={MOCK_SITES}
          items={MOCK_MASTER_ITEMS}
          submitLabel="Buat Transfer"
          onSubmit={handleCreate}
          onCancel={() => setFormOpen(false)}
          getAvailableStock={getAvailableStock}
          validateExtra={validateStock}
        />
      </Dialog>
    </main>
  );
}
