"use client";

import * as React from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (t: {
    title: string;
    description?: string;
    variant?: ToastVariant;
  }) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

/**
 * Minimal toast system: a provider that stacks transient notifications in the
 * bottom-right and auto-dismisses them. No external dependencies.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const remove = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    ({ title, description, variant = "info" }) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, title, description, variant }]);
      setTimeout(() => remove(id), AUTO_DISMISS_MS);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: () => void;
}) {
  const Icon =
    toast.variant === "success"
      ? CheckCircle2
      : toast.variant === "error"
        ? XCircle
        : Info;
  const tone =
    toast.variant === "success"
      ? "text-emerald-600"
      : toast.variant === "error"
        ? "text-destructive"
        : "text-primary";

  return (
    <div className="pointer-events-auto flex items-start gap-3 rounded-lg border bg-card p-3 shadow-lg">
      <Icon className={cn("mt-0.5 size-5 shrink-0", tone)} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{toast.title}</div>
        {toast.description && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {toast.description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup notifikasi"
        className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/** Access the toast dispatcher. Must be used under <ToastProvider>. */
export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
