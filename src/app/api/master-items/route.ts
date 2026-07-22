import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AuthorizationError, requireAdmin, requireUser } from "@/lib/auth/rbac";
import { guardWithAudit, logActivity } from "@/lib/auth/audit";
import {
  MasterItemError,
  createMasterItem,
  listMasterItems,
  parseMasterItemInput,
} from "@/lib/master-item/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * GET /api/master-items?section=…&q=…&includeInactive=1
 *
 * Returns the master item catalog (joined with sections), optionally filtered by
 * section and keyword. Available to any authenticated user — both Admin (catalog
 * management) and Storeman (transaction input) need to read items. By default
 * only active items are returned.
 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    await guardWithAudit(() => requireUser(session), {
      user: session,
      resourceTarget: "master_items:list",
    });
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section") ?? undefined;
    const query = searchParams.get("q") ?? undefined;
    const activeOnly = searchParams.get("includeInactive") !== "1";

    const items = await listMasterItems({ section, query, activeOnly });
    return NextResponse.json({ ok: true, count: items.length, items });
  } catch (err) {
    return errorResponse(err, "GET");
  }
}

/**
 * POST /api/master-items — create a new item (Admin only). Validates the
 * payload, enforces a unique item code, resolves the section, and records the
 * change in the audit log.
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    const admin = await guardWithAudit(() => requireAdmin(session), {
      user: session,
      resourceTarget: "master_items:create",
    });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new MasterItemError(400, "Body harus berupa JSON yang valid.");
    }

    const input = parseMasterItemInput(body);
    const item = await createMasterItem(input);

    await logActivity({
      userId: admin.id,
      action: "create_master_item",
      resourceTarget: `master_item:${item.itemCode}`,
      detail: `Menambah item "${item.description}".`,
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST");
  }
}

/** Map known error types to JSON responses; log and 500 for the rest. */
function errorResponse(err: unknown, method: string) {
  if (err instanceof AuthorizationError || err instanceof MasterItemError) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: err.status },
    );
  }
  console.error(`[api/master-items] ${method} failed:`, err);
  return NextResponse.json(
    { ok: false, error: "Terjadi kesalahan pada server." },
    { status: 500 },
  );
}
