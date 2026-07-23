import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  AuthorizationError,
  assertCanEditDate,
  assertSiteAccess,
} from "@/lib/auth/rbac";
import { guardWithAudit } from "@/lib/auth/audit";
import { isValidISODate, todayISODate } from "@/lib/date";
import {
  ValidationError,
  getDailyStockView,
  parseSaveDailyStockPayload,
  saveDailyStock,
} from "@/lib/daily-stock/service";

// Uses the database + next/headers — must run on the Node.js runtime.
export const runtime = "nodejs";

/**
 * GET /api/daily-stock?siteId=…&date=YYYY-MM-DD — read a day's transaction view
 * for a site: every active item with its stored movements, or a blank row whose
 * Beginning Balance carries from the previous day. Future dates are rejected.
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

    const user = await guardWithAudit(() => assertSiteAccess(session, siteId), {
      user: session,
      resourceTarget: `daily_stock:${siteId}:${date}`,
    });

    // Admins may read/record any date in the month; a Storeman is capped at today.
    if (date > todayISODate() && user.role !== "admin") {
      throw new ValidationError("Tanggal masa depan tidak tersedia.");
    }

    const rows = await getDailyStockView(siteId, date);
    return NextResponse.json({ ok: true, siteId, date, rows });
  } catch (err) {
    return errorResponse(err, "GET");
  }
}

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

    // saveDailyStock records its own audit entry (create vs. revise).
    const result = await saveDailyStock(payload, user.id);

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return errorResponse(err, "POST");
  }
}

/** Map known error types to JSON responses; log and 500 for the rest. */
function errorResponse(err: unknown, method: string) {
  if (err instanceof AuthorizationError || err instanceof ValidationError) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: err.status },
    );
  }
  console.error(`[api/daily-stock] ${method} failed:`, err);
  return NextResponse.json(
    { ok: false, error: "Terjadi kesalahan pada server." },
    { status: 500 },
  );
}
