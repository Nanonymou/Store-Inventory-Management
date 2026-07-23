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
import { useAuditLogs } from "@/hooks/use-audit-logs";
import { useRequireAdmin } from "@/hooks/use-require-admin";

/**
 * Audit Log (Admin only). Integrates the user, action-type, and date-range
 * filters over the activity trail from /api/audit-logs; all filters compose and
 * update the table live.
 */
export default function AuditLogPage() {
  // Audit Log is Admin-only; withhold content from non-Admins (they are
  // redirected to the access-denied page).
  const isAdmin = useRequireAdmin();

  const [filters, setFilters] =
    React.useState<AuditFilterState>(EMPTY_AUDIT_FILTERS);

  // Fetch from the backend (falls back to filtered mock if unreachable).
  const { entries, isLoading, usingMock } = useAuditLogs(filters);

  // Filter options derived from the loaded entries. A ref keeps the widest set
  // seen so far so options don't disappear once a filter narrows the results.
  const seenUsers = React.useRef<Set<string>>(new Set());
  const seenActions = React.useRef<Set<string>>(new Set());
  for (const e of entries) {
    seenUsers.current.add(e.userName);
    seenActions.current.add(e.action);
  }

  const users = React.useMemo(
    () => Array.from(seenUsers.current).sort((a, b) => a.localeCompare(b, "id")),
    [entries],
  );
  const actions = React.useMemo(
    () =>
      Array.from(seenActions.current)
        .map((key) => ({ value: key, label: actionMeta(key).label }))
        .sort((a, b) => a.label.localeCompare(b.label, "id")),
    [entries],
  );

  // All hooks are called above; safe to withhold render for non-Admins.
  if (!isAdmin) return null;

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ScrollText className="size-4" />
          <span>SIM — Keamanan</span>
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

      {usingMock && (
        <p className="text-xs text-muted-foreground">
          Backend tidak terjangkau — menampilkan data tiruan sebagai cadangan.
        </p>
      )}
    </main>
  );
}
