import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AuthorizationError, requireAdmin } from "@/lib/auth/rbac";
import { guardWithAudit, logActivity } from "@/lib/auth/audit";
import {
  MasterItemError,
  parseMasterItemInput,
  updateMasterItem,
} from "@/lib/master-item/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * PUT /api/master-items/:id — update an item (Admin only). Validates the
 * payload, enforces a unique item code (excluding this item), resolves the
 * section, and records the change in the audit log.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const admin = await guardWithAudit(() => requireAdmin(session), {
      user: session,
      resourceTarget: `master_items:update:${id}`,
    });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new MasterItemError(400, "Body harus berupa JSON yang valid.");
    }

    const input = parseMasterItemInput(body);
    const item = await updateMasterItem(id, input);

    await logActivity({
      userId: admin.id,
      action: "update_master_item",
      resourceTarget: `master_item:${item.itemCode}`,
      detail: `Mengubah item "${item.description}".`,
    });

    return NextResponse.json({ ok: true, item });
  } catch (err) {
    return errorResponse(err, "PUT");
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
  console.error(`[api/master-items/:id] ${method} failed:`, err);
  return NextResponse.json(
    { ok: false, error: "Terjadi kesalahan pada server." },
    { status: 500 },
  );
}
