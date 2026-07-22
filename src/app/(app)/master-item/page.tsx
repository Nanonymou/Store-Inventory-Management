"use client";

import * as React from "react";
import { Boxes, Search, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  MasterItemTable,
  type MasterItemSort,
  type MasterItemSortKey,
} from "@/components/master-item-table";
import { MOCK_MASTER_ITEMS } from "@/lib/mock-data";
import { ITEM_SECTIONS, type ItemSection, type MasterItem } from "@/lib/types";

type SectionFilter = ItemSection | "all";

/** Compare two items by a sort key (numeric for price, locale for the rest). */
function compareItems(
  a: MasterItem,
  b: MasterItem,
  key: MasterItemSortKey,
): number {
  if (key === "price") return a.price - b.price;
  return String(a[key] ?? "").localeCompare(String(b[key] ?? ""), "id");
}

/**
 * Master Item catalog (Admin). Adds keyword search, section filter, and
 * sortable columns over the item list (mock data). Add / edit / delete controls
 * arrive next.
 */
export default function MasterItemPage() {
  const [query, setQuery] = React.useState("");
  const [section, setSection] = React.useState<SectionFilter>("all");
  const [sort, setSort] = React.useState<MasterItemSort>({
    key: "itemCode",
    dir: "asc",
  });

  const handleSort = (key: MasterItemSortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  const items = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = MOCK_MASTER_ITEMS.filter((item) => {
      if (section !== "all" && item.section !== section) return false;
      if (!q) return true;
      return (
        item.itemCode.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.brand ?? "").toLowerCase().includes(q)
      );
    });
    const sorted = [...filtered].sort((a, b) => compareItems(a, b, sort.key));
    if (sort.dir === "desc") sorted.reverse();
    return sorted;
  }, [query, section, sort]);

  const isFiltered = query.trim() !== "" || section !== "all";

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
        <CardHeader className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Daftar Item</CardTitle>
            <CardDescription>
              {items.length} dari {MOCK_MASTER_ITEMS.length} item
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={section}
              onValueChange={(v) => setSection(v as SectionFilter)}
              options={[
                { value: "all", label: "Semua Seksi" },
                ...ITEM_SECTIONS.map((s) => ({ value: s, label: s })),
              ]}
              className="w-full sm:w-[200px]"
            />
            <div className="relative w-full sm:w-[240px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari item code, deskripsi, brand…"
                className="pl-8"
              />
            </div>
            {isFiltered && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setSection("all");
                }}
              >
                <X className="size-4" />
                Reset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <MasterItemTable items={items} sort={sort} onSort={handleSort} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Data pada halaman ini masih tiruan (mock). Fitur tambah, edit, dan hapus
        item akan ditambahkan pada langkah berikutnya.
      </p>
    </main>
  );
}
