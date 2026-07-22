"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ShieldCheck, User } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AuditLogEntry } from "@/lib/audit-mock";

/** Human label + badge tone for an action key. */
export function actionMeta(action: string): {
  label: string;
  variant: BadgeProps["variant"];
  className?: string;
} {
  switch (action) {
    case "create":
    case "create_master_item":
      return {
        label: "Buat",
        variant: "muted",
        className: "bg-emerald-500/10 text-emerald-700",
      };
    case "update":
    case "update_master_item":
      return { label: "Ubah", variant: "default" };
    case "delete":
    case "delete_master_item":
    case "deactivate_master_item":
      return {
        label: "Hapus",
        variant: "muted",
        className: "bg-destructive/10 text-destructive",
      };
    case "save_daily_stock":
      return { label: "Simpan Transaksi", variant: "secondary" };
    case "login":
      return { label: "Login", variant: "muted" };
    case "logout":
      return { label: "Logout", variant: "muted" };
    case "access_denied":
      return {
        label: "Akses Ditolak",
        variant: "muted",
        className: "bg-amber-500/10 text-amber-700",
      };
    default:
      return { label: action, variant: "muted" };
  }
}

interface AuditLogTableProps {
  entries: AuditLogEntry[];
  /** Render skeleton rows while data loads (used once wired to the API). */
  isLoading?: boolean;
  /** Number of skeleton rows to show when loading. */
  skeletonRows?: number;
}

/**
 * The audit trail table: who did what, when, and on which resource. Read-only.
 * Shows an absolute timestamp with a relative "… lalu" hint, and can render a
 * loading skeleton.
 */
export function AuditLogTable({
  entries,
  isLoading = false,
  skeletonRows = 6,
}: AuditLogTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className="min-w-[190px]">Waktu</TableHead>
            <TableHead className="min-w-[180px]">Pengguna</TableHead>
            <TableHead className="min-w-[130px]">Aksi</TableHead>
            <TableHead className="min-w-[180px]">Target</TableHead>
            <TableHead className="min-w-[240px]">Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {Array.from({ length: 5 }).map((__, c) => (
                  <TableCell key={c}>
                    <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-muted" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading &&
            entries.map((entry) => {
            const meta = actionMeta(entry.action);
            const when = new Date(entry.createdAt);
            return (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">
                  <div>{format(when, "dd MMM yyyy, HH:mm", { locale: localeId })}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(when, {
                      locale: localeId,
                      addSuffix: true,
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {entry.userRole === "admin" ? (
                      <ShieldCheck className="size-3.5 text-primary" />
                    ) : (
                      <User className="size-3.5 text-emerald-600" />
                    )}
                    {entry.userName}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={meta.variant} className={meta.className}>
                    {meta.label}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {entry.resourceTarget}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {entry.detail}
                </TableCell>
              </TableRow>
            );
          })}
          {!isLoading && entries.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className={cn(
                  "py-10 text-center text-sm text-muted-foreground",
                )}
              >
                Tidak ada aktivitas.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
