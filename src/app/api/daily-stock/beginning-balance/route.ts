import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AuthorizationError, assertSiteAccess } from "@/lib/auth/rbac";
import { guardWithAudit } from "@/lib/auth/audit";
import { isValidISODate, previousISODate, todayISODate } from "@/lib/date";
import {
  ValidationError,
  getBeginningBalances,
} from "@/lib/daily-stock/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * GET /api/daily-stock/beginning-balance?siteId=…&date=YYYY-MM-DD
 *
 * Returns each active item's Beginning Balance for the given date, carried over
 * from the previous day's Balance (0 when there is no prior record). The daily
 * transaction form uses this to auto-fill the Beg. Balance column.
 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const siteId = (searchParams.get("siteId") ?? "").trim();
    const date = (searchParams.get("date") ?? todayISODate()).trim();

    if (!siteId) throw new ValidationError("Parameter siteId wajib diisi.");
    if (!isValidISODate(date)) {
      throw new ValidationError("Parameter date harus format YYYY-MM-DD.");
    }

    await guardWithAudit(() => assertSiteAccess(session, siteId), {
      user: session,
      resourceTarget: `daily_stock_beginning_balance:${siteId}:${date}`,
    });

    const beginningBalances = await getBeginningBalances(siteId, date);
    return NextResponse.json({
      ok: true,
      siteId,
      date,
      sourceDate: previousISODate(date),
      beginningBalances,
    });
  } catch (err) {
    if (err instanceof AuthorizationError || err instanceof ValidationError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("[api/daily-stock/beginning-balance] GET failed:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
