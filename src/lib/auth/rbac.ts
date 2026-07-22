import type { SessionUser } from "@/lib/types";

/**
 * Role-based access control (RBAC) rules, shared by the Edge middleware and
 * server-side data actions so authentication and authorization stay consistent.
 */

/** Route prefixes that only an Admin may open. */
export const ADMIN_ONLY_PREFIXES = [
  "/admin",
  "/master-item",
  "/users",
  "/stock-transfer",
  "/stock-adjustment",
  "/audit-log",
] as const;

/** Paths that never require a session (auth entry points, health, etc.). */
export const PUBLIC_PREFIXES = ["/login", "/api/auth", "/api/health"] as const;

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** An Admin roams all sites; a Storeman may only touch their bound site. */
export function canAccessSite(user: SessionUser, siteId: string): boolean {
  if (user.role === "admin") return true;
  return user.siteId === siteId;
}

/**
 * Whether a user may edit the record for `isoDate` (YYYY-MM-DD).
 * Admin: any date up to and including today (never the future).
 * Storeman: today only.
 */
export function canEditDate(
  user: SessionUser,
  isoDate: string,
  today: string,
): boolean {
  if (isoDate > today) return false; // future is locked for everyone
  if (user.role === "admin") return true;
  return isoDate === today;
}

/** Thrown by the server-side guards below; carries an HTTP status. */
export class AuthorizationError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Ensure a request is authenticated. */
export function requireUser(user: SessionUser | null): SessionUser {
  if (!user) throw new AuthorizationError(401, "Autentikasi diperlukan.");
  return user;
}

/** Ensure the user is an Admin. */
export function requireAdmin(user: SessionUser | null): SessionUser {
  const u = requireUser(user);
  if (u.role !== "admin") {
    throw new AuthorizationError(403, "Akses khusus Admin.");
  }
  return u;
}

/** Ensure the user may act on the given site. */
export function assertSiteAccess(
  user: SessionUser | null,
  siteId: string,
): SessionUser {
  const u = requireUser(user);
  if (!canAccessSite(u, siteId)) {
    throw new AuthorizationError(
      403,
      "Anda tidak berhak mengakses data site ini.",
    );
  }
  return u;
}

/** Ensure the user may edit records for the given date. */
export function assertCanEditDate(
  user: SessionUser | null,
  isoDate: string,
  today: string,
): SessionUser {
  const u = requireUser(user);
  if (!canEditDate(u, isoDate, today)) {
    throw new AuthorizationError(
      403,
      u.role === "storeman"
        ? "Storeman hanya dapat menginput tanggal hari ini."
        : "Tanggal masa depan tidak dapat diedit.",
    );
  }
  return u;
}
