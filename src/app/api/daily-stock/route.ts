import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  AuthorizationError,
  assertCanEditDate,
  assertSiteAccess,
} from "@/lib/auth/rbac";
import { guardWithAudit, logActivity } from "@/lib/auth/audit";
import { todayISODate } from "@/lib/date";
import {
  ValidationError,
  parseSaveDailyStockPayload,
  saveDailyStock,
} from "@/lib/daily-stock/service";

// Uses the database + next/headers — must run on the Node.js runtime.
export const runtime = "nodejs";

/**
 * POST /api/daily-stock — save (upsert) a day's transaction entries for a site.
 *
 * Enforces authorization (site scope + date lock) with audit logging, validates
 * the payload, computes Balance server-side, and upserts the rows.
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError("Body harus berupa JSON yang valid.");
    }

    const payload = parseSaveDailyStockPayload(body);
    const today = todayISODate();

    // Authorization: correct site and an editable date, both audited on denial.
    const user = await guardWithAudit(
      () => {
        assertSiteAccess(session, payload.siteId);
        return assertCanEditDate(session, payload.date, today);
      },
      {
        user: session,
        resourceTarget: `daily_stock:${payload.siteId}:${payload.date}`,
      },
    );

    const result = await saveDailyStock(payload, user.id);

    await logActivity({
      userId: user.id,
      action: "save_daily_stock",
      resourceTarget: `daily_stock:${payload.siteId}:${payload.date}`,
      detail: `Menyimpan ${result.saved} entri transaksi harian.`,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("[api/daily-stock] POST failed:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
