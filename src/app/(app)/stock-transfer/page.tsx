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
import { Select } from "@/components/ui/select";
import {
  TransferHistoryTable,
  type TransferSort,
  type TransferSortKey,
} from "@/components/transfer-history-table";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { MOCK_TRANSFERS, type TransferStatus } from "@/lib/transfer-mock";

/**
 * Stock Transfer (Admin only). This step renders the transfer history on mock
 * data; the transfer form and stock validation arrive in the following steps.
 */
export default function StockTransferPage() {
  const isAdmin = useRequireAdmin();

  const [status, setStatus] = React.useState<TransferStatus | "all">("all");
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

  const transfers = React.useMemo(() => {
    const filtered = MOCK_TRANSFERS.filter(
      (t) => status === "all" || t.status === status,
    );
    const sorted = [...filtered].sort((a, b) => {
      const cmp =
        sort.key === "quantity"
          ? a.quantity - b.quantity
          : a.date.localeCompare(b.date);
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [status, sort]);

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
        <CardHeader className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Riwayat Transfer</CardTitle>
            <CardDescription>
              {transfers.length} dari {MOCK_TRANSFERS.length} mutasi
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Status
            </span>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as TransferStatus | "all")}
              options={[
                { value: "all", label: "Semua Status" },
                { value: "approved", label: "Disetujui" },
                { value: "pending", label: "Menunggu" },
                { value: "rejected", label: "Ditolak" },
              ]}
              className="w-full sm:w-[190px]"
            />
          </div>
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
