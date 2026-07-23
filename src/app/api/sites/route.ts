import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AuthorizationError, requireAdmin, requireUser } from "@/lib/auth/rbac";
import { guardWithAudit } from "@/lib/auth/audit";
import { listSitesForUser } from "@/lib/reference/service";
import {
  SiteError,
  createSite,
  listSitesWithStats,
  parseSiteInput,
} from "@/lib/site/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * GET /api/sites — the sites the caller may see. Admin gets all 11 locations;
 * a Storeman gets only their bound site. With `?withStats=1` an Admin receives
 * each site's assigned-user count for the location-management view.
 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    const user = await guardWithAudit(() => requireUser(session), {
      user: session,
      resourceTarget: "sites:list",
    });

    const withStats = new URL(req.url).searchParams.get("withStats") === "1";
    if (withStats && user.role === "admin") {
      const sites = await listSitesWithStats();
      return NextResponse.json({ ok: true, sites });
    }

    const sites = await listSitesForUser(user);
    return NextResponse.json({ ok: true, sites });
  } catch (err) {
    return errorResponse(err, "GET");
  }
}

/**
 * POST /api/sites — create a new location (Admin only). Validates the payload,
 * enforces a unique name, and records the change in the audit log.
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    const admin = await guardWithAudit(() => requireAdmin(session), {
      user: session,
      resourceTarget: "sites:create",
    });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new SiteError(400, "Body harus berupa JSON yang valid.");
    }

    const input = parseSiteInput(body);
    const site = await createSite(input, admin.id);
    return NextResponse.json({ ok: true, site }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST");
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
  console.error(`[api/sites] ${method} failed:`, err);
  return NextResponse.json(
    { ok: false, error: "Terjadi kesalahan pada server." },
    { status: 500 },
  );
}
