"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAdminOnlyPath } from "@/lib/auth/rbac";
import { useSession } from "@/components/session-provider";

/**
 * Client-side route guard (defense in depth alongside the Edge middleware).
 * If a Storeman navigates to an Admin-only route, they are redirected to the
 * access-denied page before the protected content renders.
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, mustChangePassword } = useSession();

  const blocked = !isAdmin && isAdminOnlyPath(pathname);
  // Force a temporary-password change before anything else (except on /profile).
  const forcePasswordChange = mustChangePassword && pathname !== "/profile";

  React.useEffect(() => {
    if (blocked) router.replace("/forbidden");
    else if (forcePasswordChange) router.replace("/profile");
  }, [blocked, forcePasswordChange, router]);

  // Avoid flashing protected content while a redirect is in flight.
  if (blocked || forcePasswordChange) return null;

  return <>{children}</>;
}
