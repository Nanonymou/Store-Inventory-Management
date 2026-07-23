"use client";

import * as React from "react";
import { Building2, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { useAsync } from "@/hooks/use-async";
import { apiGet, apiSend, ApiError } from "@/lib/api/client";

interface SiteStat {
  id: string;
  name: string;
  location: string;
  userCount: number;
}

/** Small controlled form for creating/editing a location. */
function SiteForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial?: { name: string; location: string };
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: { name: string; location: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [location, setLocation] = React.useState(initial?.location ?? "");
  const [touched, setTouched] = React.useState(false);

  const nameError = touched && !name.trim() ? "Nama lokasi wajib diisi." : "";
  const locError =
    touched && !location.trim() ? "Alamat/kota wajib diisi." : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || !location.trim()) return;
    onSubmit({ name: name.trim(), location: location.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="site-name">Nama Lokasi</Label>
        <Input
          id="site-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Site A"
          autoFocus
        />
        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="site-location">Alamat / Kota</Label>
        <Input
          id="site-location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="mis. Jakarta Pusat"
        />
        {locError && <p className="text-xs text-destructive">{locError}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Kelola Lokasi — Admin CRUD over the store locations, backed by /api/sites. */
export default function SitesPage() {
  const isAdmin = useRequireAdmin();
  const { toast } = useToast();

  const { data, loading, error, reload } = useAsync(
    () => apiGet<{ sites: SiteStat[] }>("/api/sites", { withStats: "1" }),
    [],
  );

  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SiteStat | null>(null);
  const [deleting, setDeleting] = React.useState<SiteStat | null>(null);
  const [busy, setBusy] = React.useState(false);

  const sites = data?.sites ?? [];

  const handleAdd = async (values: { name: string; location: string }) => {
    setBusy(true);
    try {
      await apiSend("POST", "/api/sites", values);
      toast({ variant: "success", title: `Lokasi ${values.name} ditambahkan.` });
      setAddOpen(false);
      reload();
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal menambah lokasi",
        description: err instanceof ApiError ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = async (values: { name: string; location: string }) => {
    if (!editing) return;
    setBusy(true);
    try {
      await apiSend("PUT", `/api/sites/${editing.id}`, values);
      toast({ variant: "success", title: `Lokasi ${values.name} diperbarui.` });
      setEditing(null);
      reload();
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal memperbarui lokasi",
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
      await apiSend("DELETE", `/api/sites/${deleting.id}`);
      toast({ variant: "success", title: `Lokasi ${deleting.name} dihapus.` });
      setDeleting(null);
      reload();
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal menghapus lokasi",
        description: err instanceof ApiError ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <main className="mx-auto flex max-w-[1000px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="size-4" />
            <span>SIM — Lokasi</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Kelola Lokasi</h1>
          <p className="text-sm text-muted-foreground">
            Tambah, ubah, atau hapus lokasi penyimpanan. Lokasi yang masih
            memiliki pengguna atau riwayat stok tidak dapat dihapus.
          </p>
        </div>
        <Button type="button" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Tambah Lokasi
        </Button>
      </header>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Daftar Lokasi</CardTitle>
          <CardDescription>
            {loading ? "Memuat…" : `${sites.length} lokasi`}
          </CardDescription>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead className="w-10 text-center">No</TableHead>
                    <TableHead className="min-w-[160px]">Nama Lokasi</TableHead>
                    <TableHead className="min-w-[200px]">Alamat / Kota</TableHead>
                    <TableHead className="min-w-[100px] text-right">
                      Pengguna
                    </TableHead>
                    <TableHead className="min-w-[120px] text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.length === 0 && !loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        Belum ada lokasi. Klik “Tambah Lokasi”.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sites.map((site, i) => (
                      <TableRow key={site.id}>
                        <TableCell className="text-center text-muted-foreground">
                          {i + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {site.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="size-3.5" />
                            {site.location}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Users className="size-3.5" />
                            {site.userCount}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditing(site)}
                            >
                              <Pencil className="size-4" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Hapus ${site.name}`}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setDeleting(site)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tambah Lokasi"
        description="Masukkan nama dan alamat lokasi baru. Nama harus unik."
      >
        <SiteForm
          submitLabel={busy ? "Menyimpan…" : "Tambah"}
          busy={busy}
          onSubmit={handleAdd}
          onCancel={() => setAddOpen(false)}
        />
      </Dialog>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit Lokasi"
        description={editing ? `Ubah detail untuk ${editing.name}.` : undefined}
      >
        {editing && (
          <SiteForm
            initial={{ name: editing.name, location: editing.location }}
            submitLabel={busy ? "Menyimpan…" : "Simpan Perubahan"}
            busy={busy}
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Dialog>

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Hapus Lokasi"
      >
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Yakin ingin menghapus{" "}
              <span className="font-medium text-foreground">
                {deleting.name} — {deleting.location}
              </span>
              ? Tindakan ini tidak dapat dibatalkan.
              {deleting.userCount > 0 && (
                <>
                  {" "}
                  Lokasi ini masih memiliki{" "}
                  <span className="font-medium text-foreground">
                    {deleting.userCount} pengguna
                  </span>{" "}
                  dan tidak akan bisa dihapus sebelum pengguna dipindahkan.
                </>
              )}
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
