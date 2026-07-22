import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import type { UserRole } from "@/lib/types";

export interface AuditLogFilters {
  /** Filter by the acting user's name, or "all"/undefined for no filter. */
  user?: string;
  /** Filter by action key, or "all"/undefined for no filter. */
  action?: string;
  /** Inclusive lower bound on the entry's calendar date (YYYY-MM-DD). */
  from?: string;
  /** Inclusive upper bound on the entry's calendar date (YYYY-MM-DD). */
  to?: string;
  /** Keyword matched against the target/detail. */
  q?: string;
  /** Max rows to return (defaults to 100). */
  limit?: number;
  /** Rows to skip, for pagination (defaults to 0). */
  offset?: number;
}

export interface AuditLogDTO {
  id: string;
  userName: string;
  userRole: UserRole;
  action: string;
  resourceTarget: string;
  detail: string;
  createdAt: string;
}

/** Build the WHERE conditions shared by the list and count queries. */
function auditConditions(filters: AuditLogFilters): SQL[] {
  const conditions: SQL[] = [];

  if (filters.action && filters.action !== "all") {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  if (filters.user && filters.user !== "all") {
    conditions.push(eq(users.name, filters.user));
  }
  if (filters.from) {
    conditions.push(sql`${auditLogs.createdAt}::date >= ${filters.from}`);
  }
  if (filters.to) {
    conditions.push(sql`${auditLogs.createdAt}::date <= ${filters.to}`);
  }
  if (filters.q && filters.q.trim()) {
    const like = `%${filters.q.trim()}%`;
    const match = or(
      ilike(auditLogs.resourceTarget, like),
      ilike(auditLogs.detail, like),
    );
    if (match) conditions.push(match);
  }
  return conditions;
}

/**
 * Read audit log entries (newest first) joined with the acting user, applying
 * user/action/date-range/keyword filters with pagination. System entries with
 * no user (e.g. failed logins) surface as "Sistem".
 */
export async function listAuditLogs(
  filters: AuditLogFilters = {},
): Promise<AuditLogDTO[]> {
  const conditions = auditConditions(filters);

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      resourceTarget: auditLogs.resourceTarget,
      detail: auditLogs.detail,
      createdAt: auditLogs.createdAt,
      userName: users.name,
      userRole: users.role,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(Math.min(filters.limit ?? 100, 500))
    .offset(filters.offset ?? 0);

  return rows.map((r) => ({
    id: r.id,
    userName: r.userName ?? "Sistem",
    userRole: (r.userRole ?? "storeman") as UserRole,
    action: r.action,
    resourceTarget: r.resourceTarget,
    detail: r.detail ?? "",
    createdAt: new Date(r.createdAt).toISOString(),
  }));
}

/** Total number of audit entries matching the filters (for pagination). */
export async function countAuditLogs(
  filters: AuditLogFilters = {},
): Promise<number> {
  const conditions = auditConditions(filters);
  const [row] = await db
    .select({ total: count() })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined);
  return row?.total ?? 0;
}
