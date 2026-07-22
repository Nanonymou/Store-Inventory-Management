import type { AuditLogEntry } from "./audit-mock";
import { toISODate } from "./date";

export interface AuditFilters {
  user: string;
  action: string;
  from: string;
  to: string;
}

/**
 * Filter + sort (newest first) audit entries by user, action, and inclusive
 * date range. Pure — shared by the client mock fallback and any server-side
 * filtering that mirrors the same contract.
 */
export function filterAuditEntries(
  entries: AuditLogEntry[],
  filters: AuditFilters,
): AuditLogEntry[] {
  return entries
    .filter((l) => {
      if (filters.user !== "all" && l.userName !== filters.user) return false;
      if (filters.action !== "all" && l.action !== filters.action) {
        return false;
      }
      const day = toISODate(new Date(l.createdAt));
      if (filters.from && day < filters.from) return false;
      if (filters.to && day > filters.to) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Serialize filters into query params for the audit-log API. */
export function auditFiltersToParams(filters: AuditFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.user !== "all") params.set("user", filters.user);
  if (filters.action !== "all") params.set("action", filters.action);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params;
}
