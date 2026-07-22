import type { SessionUser } from "@/lib/types";
import { SESSION_COOKIE, serializeSession } from "./session";

/** Session lifetime in seconds — 8 hours, matching the daily operating window. */
const SESSION_MAX_AGE = 8 * 60 * 60;

/**
 * Write the mock session cookie from the browser. This mirrors what the real
 * auth backend will set server-side (an httpOnly cookie); here it is a
 * client-readable stand-in so the middleware and pages can resolve a role.
 */
export function setClientSession(user: SessionUser): void {
  document.cookie = `${SESSION_COOKIE}=${serializeSession(user)}; path=/; max-age=${SESSION_MAX_AGE}; samesite=lax`;
}

/** Clear the mock session cookie (logout). */
export function clearClientSession(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** Read the current mock session from the browser cookie, if any. */
export function readClientSession(): SessionUser | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  try {
    const value = match.slice(SESSION_COOKIE.length + 1);
    const raw = JSON.parse(decodeURIComponent(value)) as SessionUser;
    return raw?.id ? raw : null;
  } catch {
    return null;
  }
}
