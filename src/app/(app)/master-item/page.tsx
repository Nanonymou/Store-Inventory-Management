"use client";

import * as React from "react";
import { Boxes } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MasterItemTable } from "@/components/master-item-table";
import { MOCK_MASTER_ITEMS } from "@/lib/mock-data";

/**
 * Master Item catalog (Admin only). This step renders the item list on mock
 * data; add / edit / delete controls arrive in the following steps.
 */
export default function MasterItemPage() {
  const items = MOCK_MASTER_ITEMS;

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Boxes className="size-4" />
          <span>StokMan — Master Data</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Item</h1>
        <p className="text-sm text-muted-foreground">
          Katalog barang baku yang dikelola Admin — dasar input transaksi harian.
        </p>
      </header>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Daftar Item</CardTitle>
          <CardDescription>{items.length} item terdaftar</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <MasterItemTable items={items} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Data pada halaman ini masih tiruan (mock). Fitur tambah, edit, dan hapus
        item akan ditambahkan pada langkah berikutnya.
      </p>
    </main>
  );
}
