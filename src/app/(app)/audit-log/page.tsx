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
import { AuditLogTable, actionMeta } from "@/components/audit-log-table";
import {
  AuditLogFilters,
  EMPTY_AUDIT_FILTERS,
  type AuditFilterState,
} from "@/components/audit-log-filters";
import { MOCK_AUDIT_LOGS } from "@/lib/audit-mock";
import { useAuditLogs } from "@/hooks/use-audit-logs";

/**
 * Audit Log (Admin only). Integrates the user, action-type, and date-range
 * filters over the activity trail (mock data); all filters compose and update
 * the table live.
 */
export default function AuditLogPage() {
  const [filters, setFilters] =
    React.useState<AuditFilterState>(EMPTY_AUDIT_FILTERS);

  // Filter-option sources derived from the log.
  const users = React.useMemo(() => {
    const names = new Set(MOCK_AUDIT_LOGS.map((l) => l.userName));
    return Array.from(names).sort((a, b) => a.localeCompare(b, "id"));
  }, []);

  const actions = React.useMemo(() => {
    const keys = new Set(MOCK_AUDIT_LOGS.map((l) => l.action));
    return Array.from(keys)
      .map((key) => ({ value: key, label: actionMeta(key).label }))
      .sort((a, b) => a.label.localeCompare(b.label, "id"));
  }, []);

  // Fetch from the backend (falls back to filtered mock until the API exists).
  const { entries, isLoading, usingMock } = useAuditLogs(filters);

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
        <CardHeader className="flex flex-col gap-4 border-b pb-4">
          <div className="space-y-1">
            <CardTitle>Aktivitas Sistem</CardTitle>
            <CardDescription>
              {isLoading
                ? "Memuat…"
                : `${entries.length} aktivitas${usingMock ? " (data tiruan)" : ""}`}
            </CardDescription>
          </div>
          <AuditLogFilters
            value={filters}
            onChange={setFilters}
            users={users}
            actions={actions}
          />
        </CardHeader>
        <CardContent className="p-0">
          <AuditLogTable entries={entries} isLoading={isLoading} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Data pada halaman ini masih tiruan (mock). Pencarian kata kunci akan
        ditambahkan pada langkah berikutnya.
      </p>
    </main>
  );
}
