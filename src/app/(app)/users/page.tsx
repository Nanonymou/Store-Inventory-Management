"use client";

import * as React from "react";
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, User, Users } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { UserForm, type UserFormValues } from "@/components/user-form";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { useSession } from "@/components/session-provider";
import { useAsync } from "@/hooks/use-async";
import { apiGet, apiSend, ApiError } from "@/lib/api/client";

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "storeman";
  siteId: string | null;
  siteName: string | null;
  mustChangePassword: boolean;
}

/** User Management (Admin only), backed by /api/users. */
export default function UsersPage() {
  const isAdmin = useRequireAdmin();
  const { sites, user: me } = useSession();
  const { toast } = useToast();

  const { data, loading, error, reload } = useAsync(
    () => apiGet<{ users: ApiUser[] }>("/api/users"),
    [],
  );

  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ApiUser | null>(null);
  const [resetting, setResetting] = React.useState<ApiUser | null>(null);
  const [deleting, setDeleting] = React.useState<ApiUser | null>(null);
  const [tempPassword, setTempPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const users = data?.users ?? [];

  const run = async (fn: () => Promise<void>, failTitle: string) => {
    setBusy(true);
    try {
      await fn();
      reload();
    } catch (err) {
      toast({
        variant: "error",
        title: failTitle,
        description: err instanceof ApiError ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = (values: UserFormValues) =>
    run(async () => {
      await apiSend("POST", "/api/users", values);
      toast({ variant: "success", title: `Akun ${values.email} dibuat.` });
      setAddOpen(false);
    }, "Gagal membuat akun");

  const handleEdit = (values: UserFormValues) => {
    if (!editing) return;
    run(async () => {
      await apiSend("PUT", `/api/users/${editing.id}`, {
        name: values.name,
        role: values.role,
        siteId: values.siteId,
      });
      toast({ variant: "success", title: `Akun ${editing.email} diperbarui.` });
      setEditing(null);
    }, "Gagal memperbarui akun");
  };

  const handleReset = () => {
    if (!resetting) return;
    run(async () => {
      await apiSend("POST", `/api/users/${resetting.id}/reset-password`, {
        password: tempPassword,
      });
      toast({
        variant: "success",
        title: "Password direset",
        description: `${resetting.email} harus ganti password saat login.`,
      });
      setResetting(null);
      setTempPassword("");
    }, "Gagal reset password");
  };

  const handleDelete = () => {
    if (!deleting) return;
    run(async () => {
      await apiSend("DELETE", `/api/users/${deleting.id}`);
      toast({ variant: "success", title: `Akun ${deleting.email} dihapus.` });
      setDeleting(null);
    }, "Gagal menghapus akun");
  };

  if (!isAdmin) return null;

  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            <span>StokMan — Manajemen Pengguna</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Pengguna</h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun Admin dan Storeman. Storeman terikat ke satu site.
          </p>
        </div>
        <Button type="button" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Tambah Pengguna
        </Button>
      </header>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Daftar Pengguna</CardTitle>
          <CardDescription>
            {loading ? "Memuat…" : `${users.length} akun`}
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
            <div className="rounded-lg border-0">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead className="min-w-[180px]">Nama</TableHead>
                    <TableHead className="min-w-[200px]">Email</TableHead>
                    <TableHead className="min-w-[110px]">Peran</TableHead>
                    <TableHead className="min-w-[120px]">Site</TableHead>
                    <TableHead className="min-w-[200px] text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-1.5">
                          {u.role === "admin" ? (
                            <ShieldCheck className="size-3.5 text-primary" />
                          ) : (
                            <User className="size-3.5 text-emerald-600" />
                          )}
                          {u.name}
                          {u.id === me.id && (
                            <span className="text-xs text-muted-foreground">
                              (Anda)
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="muted"
                          className={
                            u.role === "admin"
                              ? "bg-primary/10 text-primary"
                              : "bg-emerald-500/10 text-emerald-700"
                          }
                        >
                          {u.role === "admin" ? "Admin" : "Storeman"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.siteName ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(u)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Reset password ${u.email}`}
                            onClick={() => setResetting(u)}
                          >
                            <KeyRound className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Hapus ${u.email}`}
                            disabled={u.id === me.id}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                            onClick={() => setDeleting(u)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && users.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        Belum ada pengguna.
                      </TableCell>
                    </TableRow>
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
        title="Tambah Pengguna"
        description="Buat akun baru. Password sementara wajib diganti saat login pertama."
      >
        <UserForm
          sites={sites}
          mode="create"
          submitLabel={busy ? "Menyimpan…" : "Buat Akun"}
          onSubmit={handleAdd}
          onCancel={() => setAddOpen(false)}
        />
      </Dialog>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit Pengguna"
        description={editing?.email}
      >
        {editing && (
          <UserForm
            sites={sites}
            mode="edit"
            initial={{
              name: editing.name,
              role: editing.role,
              siteId: editing.siteId,
            }}
            submitLabel={busy ? "Menyimpan…" : "Simpan Perubahan"}
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Dialog>

      <Dialog
        open={resetting !== null}
        onClose={() => {
          setResetting(null);
          setTempPassword("");
        }}
        title="Reset Password"
        description={
          resetting ? `Password sementara baru untuk ${resetting.email}.` : undefined
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Password Sementara</Label>
            <Input
              type="text"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              placeholder="min. 8 karakter, huruf + angka"
            />
            <p className="text-xs text-muted-foreground">
              Pengguna wajib mengganti password ini saat login berikutnya.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setResetting(null);
                setTempPassword("");
              }}
            >
              Batal
            </Button>
            <Button type="button" disabled={busy} onClick={handleReset}>
              <KeyRound className="size-4" />
              {busy ? "Mereset…" : "Reset Password"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Hapus Pengguna"
      >
        {deleting && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Yakin ingin menghapus akun{" "}
              <span className="font-medium text-foreground">
                {deleting.name} ({deleting.email})
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
