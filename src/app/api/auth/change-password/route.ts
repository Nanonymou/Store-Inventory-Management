import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  getSession,
  serializeSession,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { AuthorizationError, requireUser } from "@/lib/auth/rbac";
import { UserError, changePassword } from "@/lib/user/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * POST /api/auth/change-password — change one's own password. Verifies the
 * current password, applies the new one, clears the must-change flag, and
 * re-issues the session cookie so the flag is reflected immediately.
 */
export async function POST(req: Request) {
  try {
    const user = requireUser(await getSession());

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new UserError(400, "Body harus berupa JSON yang valid.");
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const oldPassword =
      typeof b.oldPassword === "string" ? b.oldPassword : "";
    const newPassword =
      typeof b.newPassword === "string" ? b.newPassword : "";

    await changePassword(user.id, oldPassword, newPassword);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(
      SESSION_COOKIE,
      serializeSession({ ...user, mustChangePassword: false }),
      sessionCookieOptions(),
    );
    return res;
  } catch (err) {
    if (err instanceof AuthorizationError || err instanceof UserError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("[api/auth/change-password] failed:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
