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

/** Prefix for any app-scoped browser storage, cleared on logout. */
const STORAGE_PREFIX = "stokman:";

/**
 * Clear the mock session cookie AND any app-scoped local/session storage, so
 * logging out leaves no client-side trace of the previous user. Safe to call in
 * any browser context.
 */
export function clearClientSession(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;

  for (const storage of [
    typeof localStorage !== "undefined" ? localStorage : null,
    typeof sessionStorage !== "undefined" ? sessionStorage : null,
  ]) {
    if (!storage) continue;
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    keys.forEach((k) => storage.removeItem(k));
  }
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
