import { NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/auth/rbac";
import { requireAdminApi } from "@/lib/auth/api-guard";
import {
  AdjustmentError,
  createAdjustment,
  parseCreateAdjustment,
} from "@/lib/adjustment/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

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
