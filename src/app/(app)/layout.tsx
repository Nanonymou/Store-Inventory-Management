import { AppShell } from "@/components/app-shell";
import { SessionProvider } from "@/components/session-provider";
import { RouteGuard } from "@/components/route-guard";
import { ToastProvider } from "@/components/ui/toast";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <ToastProvider>
        <AppShell>
          <RouteGuard>{children}</RouteGuard>
        </AppShell>
      </ToastProvider>
    </SessionProvider>
  );
}
