"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiSend } from "@/lib/api/client";
import type { SessionUser, Site } from "@/lib/types";

interface SessionContextValue {
  user: SessionUser;
  /** Sites the user may act on (Admin: all; Storeman: their own). */
  sites: Site[];
  /** Currently selected site id (Admin can change it; Storeman is fixed). */
  activeSiteId: string;
  setActiveSiteId: (siteId: string) => void;
  activeSite: Site | null;
  isAdmin: boolean;
  /** True while the user must still change a temporary password. */
  mustChangePassword: boolean;
  logout: (reason?: "idle") => void;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

/** Storage key for the Admin's selected site (cleared on logout). */
const ACTIVE_SITE_KEY = "stokman:activeSiteId";

function readStoredSiteId(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_SITE_KEY);
  } catch {
    return null;
  }
}

/**
 * Provides the authenticated session to the app pages. Resolves the session and
 * the accessible sites from the API on mount, redirecting to /login when there
 * is no valid session. Exposes the active site — the single source of truth for
 * the shell's site picker and the pages that read it (Admin can switch across
 * the sites they can see; a Storeman is pinned to theirs).
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [sites, setSites] = React.useState<Site[]>([]);
  const [checked, setChecked] = React.useState(false);
  const [activeSiteId, setActiveSiteId] = React.useState<string>("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ user: current }, { sites: siteList }] = await Promise.all([
          apiGet<{ user: SessionUser }>("/api/auth/session"),
          apiGet<{ sites: Site[] }>("/api/sites"),
        ]);
        if (cancelled) return;
        setUser(current);
        setSites(siteList);

        if (current.role === "storeman") {
          setActiveSiteId(current.siteId ?? siteList[0]?.id ?? "");
        } else {
          const stored = readStoredSiteId();
          const valid = stored && siteList.some((s) => s.id === stored);
          setActiveSiteId(valid ? stored : (siteList[0]?.id ?? ""));
        }
        setChecked(true);
      } catch {
        if (!cancelled) router.replace("/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const logout = React.useCallback(
    (reason?: "idle") => {
      // Best-effort server logout, then leave regardless of the result.
      apiSend("POST", "/api/auth/logout").catch(() => {});
      try {
        localStorage.removeItem(ACTIVE_SITE_KEY);
      } catch {
        /* ignore */
      }
      router.replace(reason === "idle" ? "/login?reason=idle" : "/login");
    },
    [router],
  );

  // Persist the Admin's active-site choice across sessions.
  React.useEffect(() => {
    if (!checked || !user || user.role !== "admin" || !activeSiteId) return;
    try {
      localStorage.setItem(ACTIVE_SITE_KEY, activeSiteId);
    } catch {
      /* storage may be unavailable */
    }
  }, [checked, user, activeSiteId]);

  // Auto-logout after 30 minutes of inactivity (PRD session security).
  React.useEffect(() => {
    if (!checked || !user) return;
    const IDLE_MS = 30 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => logout("idle"), IDLE_MS);
    };
    const events = ["mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [checked, user, logout]);

  if (!checked || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Memuat sesi…
      </div>
    );
  }

  const isAdmin = user.role === "admin";
  const effectiveSiteId = isAdmin
    ? activeSiteId
    : (user.siteId ?? activeSiteId);
  const activeSite = sites.find((s) => s.id === effectiveSiteId) ?? null;

  const value: SessionContextValue = {
    user,
    sites,
    activeSiteId: effectiveSiteId,
    setActiveSiteId: isAdmin ? setActiveSiteId : () => {},
    activeSite,
    isAdmin,
    mustChangePassword: user.mustChangePassword === true,
    logout,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

/** Access the authenticated session. Must be used under <SessionProvider>. */
export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
