import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { getSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/auth/audit";

// Reads the session + writes the audit log — Node.js runtime.
export const runtime = "nodejs";

/**
 * POST /api/auth/logout — clear the session cookie and record the logout.
 * Idempotent: succeeds even when there is no active session.
 */
export async function POST() {
  const session = await getSession();

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  if (session) {
    await logActivity({
      userId: session.id,
      action: "logout",
      resourceTarget: "session",
      detail: "Logout dari aplikasi.",
    });
  }

  return res;
}
