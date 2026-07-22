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
  const { isAdmin } = useSession();

  const blocked = !isAdmin && isAdminOnlyPath(pathname);

  React.useEffect(() => {
    if (blocked) router.replace("/forbidden");
  }, [blocked, router]);

  // Avoid flashing protected content while the redirect is in flight.
  if (blocked) return null;

  return <>{children}</>;
}
