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
import { TransferHistoryTable } from "@/components/transfer-history-table";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { MOCK_TRANSFERS } from "@/lib/transfer-mock";

/**
 * Stock Transfer (Admin only). This step renders the transfer history on mock
 * data; the transfer form and stock validation arrive in the following steps.
 */
export default function StockTransferPage() {
  const isAdmin = useRequireAdmin();

  const transfers = React.useMemo(
    () => [...MOCK_TRANSFERS].sort((a, b) => b.date.localeCompare(a.date)),
    [],
  );

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
        <CardHeader className="border-b pb-4">
          <CardTitle>Riwayat Transfer</CardTitle>
          <CardDescription>{transfers.length} mutasi tercatat</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <TransferHistoryTable transfers={transfers} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Data pada halaman ini masih tiruan (mock). Form transfer dan validasi
        stok akan ditambahkan pada langkah berikutnya.
      </p>
    </main>
  );
}
