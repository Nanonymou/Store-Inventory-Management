"use client";

import * as React from "react";
import { ScrollText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuditLogTable } from "@/components/audit-log-table";
import { MOCK_AUDIT_LOGS } from "@/lib/audit-mock";

/**
 * Audit Log (Admin only). This step renders the activity trail on mock data;
 * search and filter controls arrive in the following steps.
 */
export default function AuditLogPage() {
  // Newest first.
  const entries = React.useMemo(
    () =>
      [...MOCK_AUDIT_LOGS].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [],
  );

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ScrollText className="size-4" />
          <span>StokMan — Keamanan</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Rekam jejak aktivitas seluruh pengguna: siapa, melakukan apa, kapan,
          dan pada data mana.
        </p>
      </header>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Aktivitas Sistem</CardTitle>
          <CardDescription>{entries.length} aktivitas tercatat</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <AuditLogTable entries={entries} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Data pada halaman ini masih tiruan (mock). Pencarian dan filter akan
        ditambahkan pada langkah berikutnya.
      </p>
    </main>
  );
}
