import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AuthorizationError, requireAdmin } from "@/lib/auth/rbac";
import { guardWithAudit } from "@/lib/auth/audit";
import { isValidISODate } from "@/lib/date";
import { listAuditLogs } from "@/lib/audit/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * GET /api/audit-logs?user=&action=&from=&to= — Admin-only retrieval of the
 * audit trail (newest first), filtered by acting user, action, and calendar
 * date range. Non-Admin requests are denied (403) and audited.
 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    await guardWithAudit(() => requireAdmin(session), {
      user: session,
      resourceTarget: "audit_logs:list",
    });

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

    const entries = await listAuditLogs({
      user: searchParams.get("user") ?? undefined,
      action: searchParams.get("action") ?? undefined,
      from,
      to,
    });

    return NextResponse.json({ ok: true, count: entries.length, entries });
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
