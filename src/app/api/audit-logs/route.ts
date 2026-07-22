import { NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/auth/rbac";
import { requireAdminApi } from "@/lib/auth/api-guard";
import { isValidISODate } from "@/lib/date";
import { countAuditLogs, listAuditLogs } from "@/lib/audit/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * GET /api/audit-logs?user=&action=&from=&to=&q=&page=&limit= — Admin-only
 * retrieval of the audit trail (newest first), filtered by acting user, action,
 * calendar date range, and keyword, with pagination. Non-Admin requests are
 * denied (403) and audited.
 */
export async function GET(req: Request) {
  try {
    // Admin-only: the audit trail is security-sensitive.
    await requireAdminApi("audit_logs:list");

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    if (from && !isValidISODate(from)) {
      return NextResponse.json(
        { ok: false, error: "Parameter from harus format YYYY-MM-DD." },
        { status: 400 },
      );
    }
    if (to && !isValidISODate(to)) {
      return NextResponse.json(
        { ok: false, error: "Parameter to harus format YYYY-MM-DD." },
        { status: 400 },
      );
    }

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 100, 1),
      500,
    );
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const offset = (page - 1) * limit;

    const commonFilters = {
      user: searchParams.get("user") ?? undefined,
      action: searchParams.get("action") ?? undefined,
      from,
      to,
      q: searchParams.get("q") ?? undefined,
    };

    const [entries, total] = await Promise.all([
      listAuditLogs({ ...commonFilters, limit, offset }),
      countAuditLogs(commonFilters),
    ]);

    return NextResponse.json({
      ok: true,
      count: entries.length,
      total,
      page,
      limit,
      hasMore: offset + entries.length < total,
      entries,
    });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("[api/audit-logs] GET failed:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
