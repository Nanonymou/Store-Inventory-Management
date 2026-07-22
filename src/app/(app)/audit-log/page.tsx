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
import { Select } from "@/components/ui/select";
import { AuditLogTable } from "@/components/audit-log-table";
import { MOCK_AUDIT_LOGS } from "@/lib/audit-mock";

/**
 * Audit Log (Admin only). Renders the activity trail on mock data with a filter
 * by user; date filter and search arrive in the following steps.
 */
export default function AuditLogPage() {
  const [user, setUser] = React.useState<string>("all");

  // Unique users present in the log, for the filter dropdown.
  const users = React.useMemo(() => {
    const names = new Set(MOCK_AUDIT_LOGS.map((l) => l.userName));
    return Array.from(names).sort((a, b) => a.localeCompare(b, "id"));
  }, []);

  const entries = React.useMemo(() => {
    return [...MOCK_AUDIT_LOGS]
      .filter((l) => user === "all" || l.userName === user)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [user]);

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
        <CardHeader className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Aktivitas Sistem</CardTitle>
            <CardDescription>
              {entries.length} dari {MOCK_AUDIT_LOGS.length} aktivitas
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Pengguna
            </span>
            <Select
              value={user}
              onValueChange={setUser}
              options={[
                { value: "all", label: "Semua Pengguna" },
                ...users.map((u) => ({ value: u, label: u })),
              ]}
              className="w-full sm:w-[240px]"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <AuditLogTable entries={entries} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Data pada halaman ini masih tiruan (mock). Filter tanggal dan pencarian
        akan ditambahkan pada langkah berikutnya.
      </p>
    </main>
  );
}
