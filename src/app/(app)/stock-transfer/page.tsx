"use client";

import * as React from "react";
import { ArrowLeftRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { MOCK_TRANSFERS } from "@/lib/transfer-mock";

/**
 * Stock Transfer (Admin only). Transfer history on mock data with status/site/
 * keyword filters and sorting; the transfer form and stock validation arrive in
 * the following steps.
 */
export default function StockTransferPage() {
  const isAdmin = useRequireAdmin();

  const [filters, setFilters] = React.useState<TransferFilterState>(
    EMPTY_TRANSFER_FILTERS,
  );
  const [sort, setSort] = React.useState<TransferSort>({
    key: "date",
    dir: "desc",
  });

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
    for (const t of MOCK_TRANSFERS) {
      set.add(t.fromSite);
      set.add(t.toSite);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, []);

  const transfers = React.useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const filtered = MOCK_TRANSFERS.filter((t) => {
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
  }, [filters, sort]);

  if (!isAdmin) return null;

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeftRight className="size-4" />
          <span>StokMan — Mutasi Antar Site</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Stock Transfer</h1>
        <p className="text-sm text-muted-foreground">
          Pemindahan barang antar lokasi yang menjaga sinkronisasi stok di site
          asal dan tujuan.
        </p>
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
        Data pada halaman ini masih tiruan (mock). Form transfer dan validasi
        stok akan ditambahkan pada langkah berikutnya.
      </p>
    </main>
  );
}
