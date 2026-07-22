import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AuthorizationError, requireUser } from "@/lib/auth/rbac";
import { guardWithAudit } from "@/lib/auth/audit";
import { listSections } from "@/lib/reference/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * GET /api/sections — the item sections used by catalog and dashboard filters.
 * Available to any authenticated user.
 */
export async function GET() {
  try {
    const session = await getSession();
    await guardWithAudit(() => requireUser(session), {
      user: session,
      resourceTarget: "sections:list",
    });
    const sections = await listSections();
    return NextResponse.json({ ok: true, sections });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("[api/sections] GET failed:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
