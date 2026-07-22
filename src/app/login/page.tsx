"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authenticateMock, MOCK_CREDENTIALS } from "@/lib/mock-session";
import { setClientSession } from "@/lib/auth/client-session";

/**
 * Login page (mock authentication). Validates the demo credentials, writes the
 * session cookie, and routes the user to their landing page (Admin → dashboard,
 * Storeman → daily transaction). Real authentication replaces authenticateMock
 * with the Login backend later; the cookie seam stays the same.
 */
function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const idle = params.get("reason") === "idle";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const user = authenticateMock(email, password);
    if (!user) {
      setError("Email atau password salah.");
      setSubmitting(false);
      return;
    }

    setClientSession(user);
    const next = params.get("next");
    const fallback = user.role === "admin" ? "/dashboard" : "/transaksi";
    // Never bounce a Storeman into an admin-only next target.
    const target =
      next && (user.role === "admin" || !isAdminPath(next)) ? next : fallback;
    router.replace(target);
  };

  const fillDemo = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
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
          Masuk
        </Button>
      </form>

      <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p className="mb-2 font-medium">Akun demo (mock):</p>
        <ul className="space-y-1">
          {MOCK_CREDENTIALS.map((c) => (
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

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <React.Suspense fallback={null}>
        <LoginForm />
      </React.Suspense>
    </main>
  );
}
