import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  AuthorizationError,
  canEditDate,
  resolveStockSiteScope,
} from "@/lib/auth/rbac";
import { guardWithAudit } from "@/lib/auth/audit";
import { isValidISODate, todayISODate } from "@/lib/date";
import { ValidationError } from "@/lib/daily-stock/service";
import { getDashboardStock } from "@/lib/daily-stock/dashboard";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * GET /api/transactions?siteId=…&date=…&section=…&q=…
 *
 * The daily transaction data for a site + date, with optional section and
 * keyword filters. Role + site authorization is resolved centrally: a Storeman
 * is pinned to their own site, an Admin uses the requested one. The response
 * includes an `editable` flag (Storeman: today only; Admin: any past/today)
 * so the client can lock the form for read-only dates.
 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const requestedSiteId = searchParams.get("siteId");
    const date = (searchParams.get("date") ?? todayISODate()).trim();
    const section = searchParams.get("section") ?? undefined;
    const query = searchParams.get("q") ?? undefined;
    const today = todayISODate();

    if (!isValidISODate(date)) {
      throw new ValidationError("Parameter date harus format YYYY-MM-DD.");
    }
    if (date > today) {
      throw new ValidationError("Tanggal masa depan tidak tersedia.");
    }

    const { user, siteId } = await guardWithAudit(
      () => resolveStockSiteScope(session, requestedSiteId),
      {
        user: session,
        resourceTarget: `transactions:${requestedSiteId ?? "-"}:${date}`,
      },
    );

    const result = await getDashboardStock({ siteId, date, section, query });

    return NextResponse.json({
      ok: true,
      siteId,
      date,
      editable: canEditDate(user, date, today),
      rows: result.rows,
      counts: result.counts,
    });
  } catch (err) {
    if (err instanceof AuthorizationError || err instanceof ValidationError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("[api/transactions] GET failed:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
