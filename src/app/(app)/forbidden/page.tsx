"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useSession } from "@/components/session-provider";

/**
 * Access-denied page shown when a Storeman reaches an Admin-only area (via the
 * middleware or the client route guard). Offers a route back to their own work.
 */
export default function ForbiddenPage() {
  const { isAdmin } = useSession();
  const home = isAdmin ? "/dashboard" : "/transaksi";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldAlert className="size-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Akses Ditolak</h1>
        <p className="text-sm text-muted-foreground">
          Halaman ini khusus Admin. Akun Anda tidak memiliki izin untuk
          membukanya.
        </p>
      </div>
      <Link href={home} className={buttonVariants()}>
        Kembali ke halaman kerja
      </Link>
    </main>
  );
}
