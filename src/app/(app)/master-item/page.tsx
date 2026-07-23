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
import { useToast } from "@/components/ui/toast";
import {
  MasterItemTable,
  type MasterItemSort,
  type MasterItemSortKey,
} from "@/components/master-item-table";
import { ItemForm } from "@/components/item-form";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { useAsync } from "@/hooks/use-async";
import { apiGet, apiSend, ApiError } from "@/lib/api/client";
import { toMasterItem, type ApiMasterItem } from "@/lib/api/types";
import { ITEM_SECTIONS, type ItemSection, type MasterItem } from "@/lib/types";
import {
  itemToFormValues,
  type ItemFormValues,
} from "@/lib/master-item/validation";

type SectionFilter = ItemSection | "all";

function compareItems(
  a: MasterItem,
  b: MasterItem,
  key: MasterItemSortKey,
): number {
  if (key === "price") return a.price - b.price;
  return String(a[key] ?? "").localeCompare(String(b[key] ?? ""), "id");
}

/** Build the API payload from the form values. */
function toItemPayload(v: ItemFormValues) {
  return {
    itemCode: v.itemCode,
    description: v.description,
    brand: v.brand || null,
    size: v.size || null,
    unit: v.unit || null,
    price: Number(v.price),
    section: v.section,
  };
}

/** Master Item catalog (Admin), backed by /api/master-items. */
export default function MasterItemPage() {
  const isAdmin = useRequireAdmin();
  const { toast } = useToast();

  const {
    data,
    loading,
    error,
    reload,
  } = useAsync(
    () => apiGet<{ items: ApiMasterItem[] }>("/api/master-items"),
    [],
  );

  const [query, setQuery] = React.useState("");
  const [section, setSection] = React.useState<SectionFilter>("all");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MasterItem | null>(null);
  const [deleting, setDeleting] = React.useState<MasterItem | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [sort, setSort] = React.useState<MasterItemSort>({
    key: "itemCode",
    dir: "asc",
  });

  const catalog = React.useMemo(
    () => (data?.items ?? []).map(toMasterItem),
    [data],
  );

  const handleSort = (key: MasterItemSortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  const handleAdd = async (values: ItemFormValues) => {
    setBusy(true);
    try {
      await apiSend("POST", "/api/master-items", toItemPayload(values));
      toast({ variant: "success", title: `Item ${values.itemCode} ditambahkan.` });
      setAddOpen(false);
      reload();
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal menambah item",
        description: err instanceof ApiError ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = async (values: ItemFormValues) => {
    if (!editing) return;
    setBusy(true);
    try {
      await apiSend("PUT", `/api/master-items/${editing.id}`, toItemPayload(values));
      toast({ variant: "success", title: `Item ${values.itemCode} diperbarui.` });
      setEditing(null);
      reload();
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal memperbarui item",
        description: err instanceof ApiError ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await apiSend<{ mode: string }>(
        "DELETE",
        `/api/master-items/${deleting.id}`,
      );
      toast({
        variant: "success",
        title:
          res.mode === "deleted"
            ? `Item ${deleting.itemCode} dihapus.`
            : `Item ${deleting.itemCode} dinonaktifkan.`,
      });
      setDeleting(null);
      reload();
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal menghapus item",
        description: err instanceof ApiError ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
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

  if (!isAdmin) return null;

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Boxes className="size-4" />
            <span>SIM — Master Data</span>
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
              {loading
                ? "Memuat…"
                : `${items.length} dari ${catalog.length} item`}
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
          {error ? (
            <div className="p-6 text-sm text-destructive">
              {error}{" "}
              <button
                type="button"
                onClick={reload}
                className="underline underline-offset-2"
              >
                Coba lagi
              </button>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tambah Item"
        description="Masukkan detail item baru. Item Code harus unik."
      >
        <ItemForm
          existingCodes={catalog.map((i) => i.itemCode)}
          submitLabel={busy ? "Menyimpan…" : "Tambah"}
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
            submitLabel={busy ? "Menyimpan…" : "Simpan Perubahan"}
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
              ? Item dengan riwayat stok akan dinonaktifkan, bukan dihapus
              permanen.
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
                disabled={busy}
                onClick={handleDelete}
              >
                <Trash2 className="size-4" />
                {busy ? "Menghapus…" : "Hapus"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </main>
  );
}
