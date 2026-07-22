import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, parseSession } from "@/lib/auth/session";
import { isAdminOnlyPath, isPublicPath } from "@/lib/auth/rbac";

/**
 * Edge authorization middleware.
 *
 * Its job here is ROLE authorization: keep Storemen out of Admin-only areas.
 * Full authentication gating (requiring any session at all) arrives with the
 * Login feature; until then non-admin routes stay open so the mock UI is
 * browsable. Fine-grained checks (per-site scope, date lock) and audit logging
 * of denials live in the server-side guards in `@/lib/auth/rbac`, which run in
 * the Node runtime where database writes are available.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const session = parseSession(req.cookies.get(SESSION_COOKIE)?.value);

  if (isAdminOnlyPath(pathname)) {
    // Not signed in → send to login, preserving where they were headed.
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Signed in but not an Admin → bounce to their transaction page.
    if (session.role !== "admin") {
      const home = new URL("/transaksi", req.url);
      home.searchParams.set("forbidden", "1");
      return NextResponse.redirect(home);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
