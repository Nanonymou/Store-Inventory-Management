import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AuthorizationError, requireAdmin } from "@/lib/auth/rbac";
import { guardWithAudit } from "@/lib/auth/audit";
import { isValidISODate, todayISODate } from "@/lib/date";
import { ValidationError } from "@/lib/daily-stock/service";
import { getAllSitesStockView } from "@/lib/daily-stock/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * GET /api/dashboard/stock/all?date=…
 *
 * Admin-only aggregated stock recap across ALL sites for a date: each active
 * item's movement quantities summed over every location. Returns rows in the
 * same shape as /api/dashboard/stock so the dashboard renders them unchanged.
 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    await guardWithAudit(() => requireAdmin(session), {
      user: session,
      resourceTarget: "dashboard_stock:all",
    });

    const date = (
      new URL(req.url).searchParams.get("date") ?? todayISODate()
    ).trim();
    if (!isValidISODate(date)) {
      throw new ValidationError("Parameter date harus format YYYY-MM-DD.");
    }
    if (date > todayISODate()) {
      throw new ValidationError("Tanggal masa depan tidak tersedia.");
    }

    const rows = await getAllSitesStockView(date);
    return NextResponse.json({ ok: true, date, rows });
  } catch (err) {
    if (err instanceof AuthorizationError || err instanceof ValidationError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("[api/dashboard/stock/all] GET failed:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
