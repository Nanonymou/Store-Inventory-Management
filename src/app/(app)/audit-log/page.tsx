"use client";

import * as React from "react";
import { ScrollText, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuditLogTable } from "@/components/audit-log-table";
import { MOCK_AUDIT_LOGS } from "@/lib/audit-mock";
import { toISODate } from "@/lib/date";

/**
 * Audit Log (Admin only). Renders the activity trail on mock data with a filter
 * by user; date filter and search arrive in the following steps.
 */
export default function AuditLogPage() {
  const [user, setUser] = React.useState<string>("all");
  const [from, setFrom] = React.useState<string>("");
  const [to, setTo] = React.useState<string>("");

  // Unique users present in the log, for the filter dropdown.
  const users = React.useMemo(() => {
    const names = new Set(MOCK_AUDIT_LOGS.map((l) => l.userName));
    return Array.from(names).sort((a, b) => a.localeCompare(b, "id"));
  }, []);

  const entries = React.useMemo(() => {
    return [...MOCK_AUDIT_LOGS]
      .filter((l) => {
        if (user !== "all" && l.userName !== user) return false;
        // Compare on the calendar date (inclusive bounds).
        const day = toISODate(new Date(l.createdAt));
        if (from && day < from) return false;
        if (to && day > to) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [user, from, to]);

  const hasDateFilter = from !== "" || to !== "";
  const rangeInvalid = from !== "" && to !== "" && from > to;

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ScrollText className="size-4" />
          <span>StokMan — Keamanan</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Rekam jejak aktivitas seluruh pengguna: siapa, melakukan apa, kapan,
          dan pada data mana.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-3 border-b pb-4">
          <div className="space-y-1">
            <CardTitle>Aktivitas Sistem</CardTitle>
            <CardDescription>
              {entries.length} dari {MOCK_AUDIT_LOGS.length} aktivitas
            </CardDescription>
          </div>
          <div className="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-user">Pengguna</Label>
              <Select
                value={user}
                onValueChange={setUser}
                options={[
                  { value: "all", label: "Semua Pengguna" },
                  ...users.map((u) => ({ value: u, label: u })),
                ]}
                className="w-full sm:w-[220px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-from">Dari tanggal</Label>
              <Input
                id="filter-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full sm:w-[170px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-to">Sampai tanggal</Label>
              <Input
                id="filter-to"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className="w-full sm:w-[170px]"
              />
            </div>
            {(hasDateFilter || user !== "all") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUser("all");
                  setFrom("");
                  setTo("");
                }}
              >
                <X className="size-4" />
                Reset
              </Button>
            )}
          </div>
          {rangeInvalid && (
            <p className="text-xs text-destructive">
              Tanggal &quot;Dari&quot; tidak boleh melewati &quot;Sampai&quot;.
            </p>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <AuditLogTable entries={entries} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Data pada halaman ini masih tiruan (mock). Pencarian kata kunci akan
        ditambahkan pada langkah berikutnya.
      </p>
    </main>
  );
}
