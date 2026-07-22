import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AuthorizationError, resolveStockSiteScope } from "@/lib/auth/rbac";
import { guardWithAudit } from "@/lib/auth/audit";
import { isValidISODate, todayISODate } from "@/lib/date";
import { ValidationError } from "@/lib/daily-stock/service";
import { getDashboardStock } from "@/lib/daily-stock/dashboard";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * GET /api/dashboard/stock?siteId=…&date=…&section=…&q=…
 *
 * Returns the filtered dashboard stock view for a site + date (section and
 * keyword filters applied server-side) plus the Rupiah value summary and item
 * counts. Enforces site-scope authorization with audited denials.
 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const requestedSiteId = searchParams.get("siteId");
    const date = (searchParams.get("date") ?? todayISODate()).trim();
    const section = searchParams.get("section") ?? undefined;
    const query = searchParams.get("q") ?? undefined;

    if (!isValidISODate(date)) {
      throw new ValidationError("Parameter date harus format YYYY-MM-DD.");
    }
    if (date > todayISODate()) {
      throw new ValidationError("Tanggal masa depan tidak tersedia.");
    }

    // Role authorization: a Storeman is pinned to their own site; an Admin uses
    // the requested site. The effective site is what the query actually reads.
    const { siteId } = await guardWithAudit(
      () => resolveStockSiteScope(session, requestedSiteId),
      {
        user: session,
        resourceTarget: `dashboard_stock:${requestedSiteId ?? "-"}:${date}`,
      },
    );

    const result = await getDashboardStock({ siteId, date, section, query });
    return NextResponse.json({ ok: true, siteId, date, ...result });
  } catch (err) {
    if (err instanceof AuthorizationError || err instanceof ValidationError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("[api/dashboard/stock] GET failed:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
