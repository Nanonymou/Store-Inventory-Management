"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MOCK_SITES } from "@/lib/mock-data";
import { clearClientSession, readClientSession } from "@/lib/auth/client-session";
import type { SessionUser, Site } from "@/lib/types";

interface SessionContextValue {
  user: SessionUser;
  /** Sites the user may act on (Admin: all; Storeman: their own). */
  sites: Site[];
  /** Currently selected site id (Admin can change it; Storeman is fixed). */
  activeSiteId: string;
  setActiveSiteId: (siteId: string) => void;
  activeSite: Site;
  isAdmin: boolean;
  logout: () => void;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

/**
 * Provides the authenticated session to the app pages. Reads the session cookie
 * on mount and redirects to /login when absent. Exposes the active site — the
 * single source of truth for the shell's site picker and the pages that read it
 * (Admin can switch across the 11 mock sites; a Storeman is pinned to theirs).
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [checked, setChecked] = React.useState(false);
  const [activeSiteId, setActiveSiteId] = React.useState<string>("");

  React.useEffect(() => {
    const current = readClientSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    setUser(current);
    setActiveSiteId(current.role === "storeman" && current.siteId
      ? current.siteId
      : MOCK_SITES[0].id);
    setChecked(true);
  }, [router]);

  const logout = React.useCallback(() => {
    clearClientSession();
    router.replace("/login");
  }, [router]);

  if (!checked || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Memuat sesi…
      </div>
    );
  }

  const isAdmin = user.role === "admin";
  const sites = isAdmin
    ? MOCK_SITES
    : MOCK_SITES.filter((s) => s.id === user.siteId);
  const effectiveSiteId = isAdmin
    ? activeSiteId
    : (user.siteId ?? MOCK_SITES[0].id);
  const activeSite =
    MOCK_SITES.find((s) => s.id === effectiveSiteId) ?? MOCK_SITES[0];

  const value: SessionContextValue = {
    user,
    sites,
    activeSiteId: effectiveSiteId,
    setActiveSiteId: isAdmin ? setActiveSiteId : () => {},
    activeSite,
    isAdmin,
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
