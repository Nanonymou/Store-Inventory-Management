"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiSend, ApiError } from "@/lib/api/client";
import type { SessionUser } from "@/lib/types";

/** Demo accounts created by the seed script (npm run db:seed). */
const DEMO_ACCOUNTS = [
  { email: "admin@stokman.test", password: "admin123" },
  { email: "storeman.a@stokman.test", password: "storeman123" },
];

const ADMIN_PREFIXES = [
  "/master-item",
  "/users",
  "/stock-transfer",
  "/stock-adjustment",
  "/audit-log",
  "/admin",
];

function isAdminPath(path: string): boolean {
  return ADMIN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Login page. Authenticates against POST /api/auth/login (which sets an httpOnly
 * session cookie), then routes the user to their landing page (Admin → dashboard,
 * Storeman → daily transaction), honoring a safe `next` target.
 */
function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const idle = params.get("reason") === "idle";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user } = await apiSend<{ user: SessionUser }>(
        "POST",
        "/api/auth/login",
        { email, password },
      );
      const next = params.get("next");
      const fallback = user.role === "admin" ? "/dashboard" : "/transaksi";
      const target =
        next && (user.role === "admin" || !isAdminPath(next)) ? next : fallback;
      router.replace(target);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal masuk. Coba lagi.",
      );
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Package className="size-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">StokMan</h1>
        <p className="text-sm text-muted-foreground">
          Masuk untuk mengelola stok harian.
        </p>
      </div>

      {idle && (
        <p className="mb-4 rounded-md bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-700">
          Sesi berakhir karena tidak ada aktivitas. Silakan masuk kembali.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border bg-card p-6 shadow-sm"
        noValidate
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@stokman.test"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          <LogIn className="size-4" />
          {submitting ? "Memproses…" : "Masuk"}
        </Button>
      </form>

      <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p className="mb-2 font-medium">Akun demo (setelah seed):</p>
        <ul className="space-y-1">
          {DEMO_ACCOUNTS.map((c) => (
            <li key={c.email} className="flex items-center justify-between gap-2">
              <span>
                {c.email} · <span className="font-mono">{c.password}</span>
              </span>
              <button
                type="button"
                onClick={() => fillDemo(c.email, c.password)}
                className="text-primary underline-offset-2 hover:underline"
              >
                Isi
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <React.Suspense fallback={null}>
        <LoginForm />
      </React.Suspense>
    </main>
  );
}
