import { NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/auth/rbac";
import { requireAdminApi } from "@/lib/auth/api-guard";
import { UserError, resetUserPassword } from "@/lib/user/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * POST /api/users/:id/reset-password — set a new temporary password for a user
 * (Admin only). The user must change it on their next login.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = await requireAdminApi(`users:reset-password:${id}`);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new UserError(400, "Body harus berupa JSON yang valid.");
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const password = typeof b.password === "string" ? b.password : "";
    await resetUserPassword(id, password, admin.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthorizationError || err instanceof UserError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("[api/users/:id/reset-password] failed:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
