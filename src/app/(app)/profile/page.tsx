"use client";

import * as React from "react";
import { KeyRound, ShieldCheck, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/components/session-provider";
import { apiSend, ApiError } from "@/lib/api/client";

/** Profile & change-password page (any authenticated user). */
export default function ProfilePage() {
  const { user, isAdmin, mustChangePassword } = useSession();
  const { toast } = useToast();

  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("Password baru minimal 8 karakter dan mengandung huruf + angka.");
      return;
    }
    setBusy(true);
    try {
      await apiSend("POST", "/api/auth/change-password", {
        oldPassword,
        newPassword,
      });
      toast({ variant: "success", title: "Password berhasil diubah." });
      // A forced change is now cleared server-side; reload to refresh the
      // session and land the user on their home page.
      if (mustChangePassword) {
        window.location.assign(isAdmin ? "/dashboard" : "/transaksi");
      } else {
        setOldPassword("");
        setNewPassword("");
        setConfirm("");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengubah password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-[560px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="size-4" />
          <span>SIM — Profil</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Profil Saya</h1>
      </header>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2">
            {isAdmin ? (
              <ShieldCheck className="size-4 text-primary" />
            ) : (
              <User className="size-4 text-emerald-600" />
            )}
            {user.name}
          </CardTitle>
          <CardDescription>
            {isAdmin ? "Admin" : "Storeman"} · sesi aktif
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {mustChangePassword && (
            <p className="mb-4 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
              Anda memakai password sementara. Silakan ganti password untuk
              melanjutkan.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="old">Password Lama</Label>
              <Input
                id="old"
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new">Password Baru</Label>
              <Input
                id="new"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="min. 8 karakter, huruf + angka"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Konfirmasi Password Baru</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>
                <KeyRound className="size-4" />
                {busy ? "Menyimpan…" : "Ubah Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
