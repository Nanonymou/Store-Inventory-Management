import { AppShell } from "@/components/app-shell";
import { SessionProvider } from "@/components/session-provider";
import { RouteGuard } from "@/components/route-guard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AppShell>
        <RouteGuard>{children}</RouteGuard>
      </AppShell>
    </SessionProvider>
  );
}
