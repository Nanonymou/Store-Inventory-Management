import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  serializeSession,
} from "@/lib/auth/session";
import { authenticate } from "@/lib/auth/service";
import { logActivity } from "@/lib/auth/audit";
import { isDatabaseUnavailable } from "@/lib/db/errors";

// Uses the database + crypto — Node.js runtime required.
export const runtime = "nodejs";

/**
 * POST /api/auth/login — verify credentials and start a session.
 *
 * On success, sets the httpOnly session cookie and returns the user (Admin →
 * no site; Storeman → their bound site), plus whether a password change is
 * required. Invalid credentials return 401 without revealing which field was
 * wrong.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body harus berupa JSON yang valid." },
      { status: 400 },
    );
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email : "";
  const password = typeof b.password === "string" ? b.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email dan password wajib diisi." },
      { status: 400 },
    );
  }

  try {
    const result = await authenticate(email, password);
    if (!result) {
      // Record the unauthorized attempt for security investigation.
      await logActivity({
        userId: null,
        action: "login_failed",
        resourceTarget: "session",
        detail: `Percobaan login gagal untuk email: ${email}`,
      });
      return NextResponse.json(
        { ok: false, error: "Email atau password salah." },
        { status: 401 },
      );
    }

    const sessionUser = {
      ...result.user,
      mustChangePassword: result.mustChangePassword,
    };
    const res = NextResponse.json({
      ok: true,
      user: sessionUser,
      mustChangePassword: result.mustChangePassword,
    });
    res.cookies.set(
      SESSION_COOKIE,
      serializeSession(sessionUser),
      sessionCookieOptions(),
    );

    await logActivity({
      userId: result.user.id,
      action: "login",
      resourceTarget: "session",
      detail: "Login berhasil.",
    });

    return res;
  } catch (err) {
    // Distinguish "database not ready" (misconfig/not migrated) from a genuine
    // server bug, so the login screen shows an actionable message.
    if (isDatabaseUnavailable(err)) {
      console.error("[api/auth/login] database not ready:", err);
      return NextResponse.json(
        {
          ok: false,
          error:
            "Layanan sedang tidak tersedia — database belum siap. Hubungi admin. (Cek /api/health)",
        },
        { status: 503 },
      );
    }
    console.error("[api/auth/login] failed:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
