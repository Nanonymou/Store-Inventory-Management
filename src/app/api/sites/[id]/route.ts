import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AuthorizationError, requireAdmin } from "@/lib/auth/rbac";
import { guardWithAudit } from "@/lib/auth/audit";
import {
  SiteError,
  deleteSite,
  parseSiteInput,
  updateSite,
} from "@/lib/site/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * PUT /api/sites/:id — update a location (Admin only). Validates the payload,
 * enforces a unique name (excluding this site), and records the change.
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
      resourceTarget: `sites:update:${id}`,
    });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new SiteError(400, "Body harus berupa JSON yang valid.");
    }

    const input = parseSiteInput(body);
    const site = await updateSite(id, input, admin.id);
    return NextResponse.json({ ok: true, site });
  } catch (err) {
    return errorResponse(err, "PUT");
  }
}

/**
 * DELETE /api/sites/:id — remove a location (Admin only). Refused when the site
 * still has users or stock history, so historical data is never lost. Records
 * the action in the audit log.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const admin = await guardWithAudit(() => requireAdmin(session), {
      user: session,
      resourceTarget: `sites:delete:${id}`,
    });

    const result = await deleteSite(id, admin.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return errorResponse(err, "DELETE");
  }
}

/** Map known error types to JSON responses; log and 500 for the rest. */
function errorResponse(err: unknown, method: string) {
  if (err instanceof AuthorizationError || err instanceof SiteError) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: err.status },
    );
  }
  console.error(`[api/sites/:id] ${method} failed:`, err);
  return NextResponse.json(
    { ok: false, error: "Terjadi kesalahan pada server." },
    { status: 500 },
  );
}
