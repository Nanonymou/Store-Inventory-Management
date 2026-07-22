"use client";

import * as React from "react";
import type { AuditLogEntry } from "@/lib/audit-mock";
import { MOCK_AUDIT_LOGS } from "@/lib/audit-mock";
import {
  auditFiltersToParams,
  filterAuditEntries,
  type AuditFilters,
} from "@/lib/audit-filter";

interface UseAuditLogsResult {
  entries: AuditLogEntry[];
  isLoading: boolean;
  /** True when the API was unreachable and mock data is being shown instead. */
  usingMock: boolean;
  error: string | null;
}

/**
 * Load audit log entries from GET /api/audit-logs for the given filters.
 *
 * The backend endpoint is implemented in a later step; until it responds this
 * gracefully falls back to filtering the mock data client-side, so the page
 * stays functional and the wiring is ready the moment the API exists.
 */
export function useAuditLogs(filters: AuditFilters): UseAuditLogsResult {
  const [entries, setEntries] = React.useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [usingMock, setUsingMock] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Stable key so the effect only refires when a filter value actually changes.
  const params = auditFiltersToParams(filters).toString();

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/audit-logs?${params}`, { headers: { accept: "application/json" } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          ok: boolean;
          entries?: AuditLogEntry[];
        };
        if (!data.ok || !Array.isArray(data.entries)) {
          throw new Error("Bentuk respons tidak sesuai.");
        }
        if (cancelled) return;
        setEntries(data.entries);
        setUsingMock(false);
      })
      .catch(() => {
        // Backend not available yet → fall back to filtered mock data.
        if (cancelled) return;
        setEntries(filterAuditEntries(MOCK_AUDIT_LOGS, parseParams(params)));
        setUsingMock(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params]);

  return { entries, isLoading, usingMock, error };
}

/** Rebuild an AuditFilters object from a query string (for the mock fallback). */
function parseParams(query: string): AuditFilters {
  const p = new URLSearchParams(query);
  return {
    user: p.get("user") ?? "all",
    action: p.get("action") ?? "all",
    from: p.get("from") ?? "",
    to: p.get("to") ?? "",
  };
}
