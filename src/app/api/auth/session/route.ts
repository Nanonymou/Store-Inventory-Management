import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

// Reads the session cookie via next/headers — Node.js runtime.
export const runtime = "nodejs";

/**
 * GET /api/auth/session — return the current session user, or 401 when there is
 * no valid session. Used by the client to resolve who is signed in.
 */
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Tidak ada sesi aktif." },
      { status: 401 },
    );
  }
  return NextResponse.json({ ok: true, user });
}
