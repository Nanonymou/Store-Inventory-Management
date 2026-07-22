import type { SessionUser, UserRole } from "@/lib/types";

/**
 * Session handling.
 *
 * Real authentication (Better Auth) lands with the Login feature. Until then the
 * session is a signed-cookie stand-in: a JSON payload stored under
 * SESSION_COOKIE. This module is the single seam both the Edge middleware and
 * server components read through, so swapping in the real provider later only
 * touches `parseSession` / the cookie source.
 */
export const SESSION_COOKIE = "stokman_session";

/** Session lifetime in seconds — 8 hours, matching the daily operating window. */
export const SESSION_MAX_AGE = 8 * 60 * 60;

/** httpOnly cookie options for the real (server-set) session. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

interface RawSession {
  id?: string;
  name?: string;
  role?: string;
  siteId?: string | null;
  mustChangePassword?: boolean;
}

function isRole(value: unknown): value is UserRole {
  return value === "admin" || value === "storeman";
}

/** Parse a raw cookie value into a SessionUser, or null if invalid/absent. */
export function parseSession(
  cookieValue: string | undefined | null,
): SessionUser | null {
  if (!cookieValue) return null;
  try {
    const decoded = decodeURIComponent(cookieValue);
    const raw = JSON.parse(decoded) as RawSession;
    if (!raw.id || !raw.name || !isRole(raw.role)) return null;
    return {
      id: raw.id,
      name: raw.name,
      role: raw.role,
      // Admins are not bound to a site; Storemen must have one.
      siteId: raw.role === "admin" ? null : (raw.siteId ?? null),
      mustChangePassword: raw.mustChangePassword === true,
    };
  } catch {
    return null;
  }
}

/** Serialize a SessionUser into the cookie payload. */
export function serializeSession(user: SessionUser): string {
  return encodeURIComponent(JSON.stringify(user));
}

/**
 * Read the current session in a server context (Server Component / Route
 * Handler / Server Action). Uses next/headers cookies().
 */
export async function getSession(): Promise<SessionUser | null> {
  // Imported lazily so this module stays usable from the Edge middleware,
  // which supplies the cookie directly instead of via next/headers.
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return parseSession(store.get(SESSION_COOKIE)?.value);
}
