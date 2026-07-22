import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, parseSession } from "@/lib/auth/session";
import { isAdminOnlyPath, isPublicPath } from "@/lib/auth/rbac";

/**
 * Edge authorization middleware for page routes.
 *
 * Two layers of authorization run here:
 *   1. Authentication — a valid session is required for every non-public page;
 *      anonymous visitors are redirected to /login (preserving where they were
 *      headed).
 *   2. Role — Admin-only areas (master item, users, stock transfer/adjustment,
 *      audit log) reject Storemen, sending them to the access-denied page.
 *
 * Site-level authorization (a Storeman may only touch their own site) is
 * data-scoped and enforced in the server-side guards (`@/lib/auth/rbac`:
 * resolveStockSiteScope / assertSiteAccess), which also audit every denial and
 * return proper JSON. API routes therefore self-authorize and are excluded from
 * this matcher so they respond with 401/403 JSON rather than an HTML redirect.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const session = parseSession(req.cookies.get(SESSION_COOKIE)?.value);

  // 1. Authentication: no session → sign in first.
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Role: Storemen cannot enter Admin-only areas.
  if (isAdminOnlyPath(pathname) && session.role !== "admin") {
    return NextResponse.redirect(new URL("/forbidden", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on page routes only — exclude Next internals, static assets, and API
  // routes (which self-authorize and return JSON).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
