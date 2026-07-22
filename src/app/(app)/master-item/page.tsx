"use client";

import * as React from "react";
import { Boxes, Pencil, Plus, Search, Trash2, X } from "lucide-react";
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
import { Dialog } from "@/components/ui/dialog";
import {
  MasterItemTable,
  type MasterItemSort,
  type MasterItemSortKey,
} from "@/components/master-item-table";
import { ItemForm } from "@/components/item-form";
import { MOCK_MASTER_ITEMS } from "@/lib/mock-data";
import { ITEM_SECTIONS, type ItemSection, type MasterItem } from "@/lib/types";
import {
  itemToFormValues,
  type ItemFormValues,
} from "@/lib/master-item/validation";

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
  // Local catalog state (mock) so newly added items appear immediately.
  const [catalog, setCatalog] = React.useState<MasterItem[]>(MOCK_MASTER_ITEMS);
  const [query, setQuery] = React.useState("");
  const [section, setSection] = React.useState<SectionFilter>("all");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MasterItem | null>(null);
  const [deleting, setDeleting] = React.useState<MasterItem | null>(null);
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

  const handleAdd = (values: ItemFormValues) => {
    const newItem: MasterItem = {
      id: `item-${Date.now()}`,
      itemCode: values.itemCode,
      description: values.description,
      brand: values.brand,
      size: values.size,
      unit: values.unit,
      price: Number(values.price),
      section: values.section as ItemSection,
    };
    setCatalog((prev) => [newItem, ...prev]);
    setAddOpen(false);
  };

  const handleEdit = (values: ItemFormValues) => {
    if (!editing) return;
    setCatalog((prev) =>
      prev.map((item) =>
        item.id === editing.id
          ? {
              ...item,
              itemCode: values.itemCode,
              description: values.description,
              brand: values.brand,
              size: values.size,
              unit: values.unit,
              price: Number(values.price),
              section: values.section as ItemSection,
            }
          : item,
      ),
    );
    setEditing(null);
  };

  const handleDelete = () => {
    if (!deleting) return;
    setCatalog((prev) => prev.filter((item) => item.id !== deleting.id));
    setDeleting(null);
  };

  const items = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = catalog.filter((item) => {
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
  }, [catalog, query, section, sort]);

  const isFiltered = query.trim() !== "" || section !== "all";

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Boxes className="size-4" />
            <span>StokMan — Master Data</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Item</h1>
          <p className="text-sm text-muted-foreground">
            Katalog barang baku yang dikelola Admin — dasar input transaksi
            harian.
          </p>
        </div>
        <Button type="button" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Tambah Item
        </Button>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Daftar Item</CardTitle>
            <CardDescription>
              {items.length} dari {catalog.length} item
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
          <MasterItemTable
            items={items}
            sort={sort}
            onSort={handleSort}
            renderActions={(item) => (
              <div className="flex items-center justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(item)}
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Hapus ${item.itemCode}`}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleting(item)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Data pada halaman ini masih tiruan (mock) — tambah, edit, dan hapus
        tersimpan di sesi browser saja hingga backend tersambung.
      </p>

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tambah Item"
        description="Masukkan detail item baru. Item Code harus unik."
      >
        <ItemForm
          existingCodes={catalog.map((i) => i.itemCode)}
          submitLabel="Tambah"
          onSubmit={handleAdd}
          onCancel={() => setAddOpen(false)}
        />
      </Dialog>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit Item"
        description={
          editing ? `Ubah detail untuk ${editing.itemCode}.` : undefined
        }
      >
        {editing && (
          <ItemForm
            existingCodes={catalog.map((i) => i.itemCode)}
            ownCode={editing.itemCode}
            initial={itemToFormValues(editing)}
            submitLabel="Simpan Perubahan"
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Dialog>

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Hapus Item"
      >
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Yakin ingin menghapus{" "}
              <span className="font-medium text-foreground">
                {deleting.itemCode} — {deleting.description}
              </span>
              ? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleting(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
              >
                <Trash2 className="size-4" />
                Hapus
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </main>
  );
}
