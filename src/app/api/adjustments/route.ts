import { NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/auth/rbac";
import { requireAdminApi } from "@/lib/auth/api-guard";
import {
  AdjustmentError,
  countAdjustments,
  createAdjustment,
  listAdjustments,
  parseCreateAdjustment,
} from "@/lib/adjustment/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * GET /api/adjustments?siteId=&reason=&q=&sort=&dir=&page=&limit= — adjustment
 * history (Admin only) with filters, sorting (date/difference), and pagination.
 * Non-Admin requests are denied (403) and audited.
 */
export async function GET(req: Request) {
  try {
    await requireAdminApi("adjustments:list");
    const { searchParams } = new URL(req.url);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 100, 1),
      500,
    );
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const offset = (page - 1) * limit;
    const sortParam = searchParams.get("sort");
    const dirParam = searchParams.get("dir");

    const filters = {
      siteId: searchParams.get("siteId") ?? undefined,
      reason: searchParams.get("reason") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      sort: sortParam === "difference" ? ("difference" as const) : ("date" as const),
      dir: dirParam === "asc" ? ("asc" as const) : ("desc" as const),
    };

    const [adjustments, total] = await Promise.all([
      listAdjustments({ ...filters, limit, offset }),
      countAdjustments(filters),
    ]);

    return NextResponse.json({
      ok: true,
      count: adjustments.length,
      total,
      page,
      limit,
      hasMore: offset + adjustments.length < total,
      adjustments,
    });
  } catch (err) {
    if (err instanceof AuthorizationError || err instanceof AdjustmentError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("[api/adjustments] GET failed:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/adjustments — record a stock adjustment (opname) and apply the new
 * balance immediately (Admin only). Validates the site, item, and counted
 * quantity, updates today's stock balance directly, and auto-logs the change.
 */
export async function POST(req: Request) {
  try {
    const admin = await requireAdminApi("adjustments:create");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new AdjustmentError(400, "Body harus berupa JSON yang valid.");
    }

    const input = parseCreateAdjustment(body);
    const result = await createAdjustment(input, admin.id);

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthorizationError || err instanceof AdjustmentError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("[api/adjustments] POST failed:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
