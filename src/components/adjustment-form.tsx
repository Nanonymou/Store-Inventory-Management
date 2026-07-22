"use client";

import * as React from "react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ADJUSTMENT_REASONS,
  type AdjustmentReason,
} from "@/lib/adjustment-mock";
import type { MasterItem, Site } from "@/lib/types";

export interface AdjustmentFormValues {
  siteId: string;
  itemId: string;
  /** New physical count from the opname. */
  physicalCount: number;
  reason: AdjustmentReason;
  note: string;
}

export type AdjustmentFormErrors = Partial<
  Record<keyof AdjustmentFormValues, string>
>;

interface AdjustmentFormProps {
  sites: Site[];
  items: MasterItem[];
  /** Resolves the current system stock (before) for an item at a site. */
  getCurrentStock: (siteId: string, itemId: string) => number;
  submitLabel?: string;
  onSubmit: (values: AdjustmentFormValues) => void;
  onCancel: () => void;
}

/**
 * Stock adjustment (opname) form: pick a site and item, enter the counted
 * physical quantity, and a reason. The system stock (before), the new value
 * (after), and the signed difference are shown so the correction is explicit.
 */
export function AdjustmentForm({
  sites,
  items,
  getCurrentStock,
  submitLabel = "Simpan",
  onSubmit,
  onCancel,
}: AdjustmentFormProps) {
  const [siteId, setSiteId] = React.useState("");
  const [itemId, setItemId] = React.useState("");
  const [physical, setPhysical] = React.useState("");
  const [reason, setReason] = React.useState<AdjustmentReason | "">("");
  const [note, setNote] = React.useState("");
  const [errors, setErrors] = React.useState<AdjustmentFormErrors>({});

  const clearError = (key: keyof AdjustmentFormValues) =>
    setErrors((prev) => ({ ...prev, [key]: undefined }));

  const before =
    siteId && itemId ? getCurrentStock(siteId, itemId) : null;
  const after = physical.trim() === "" ? null : Number(physical);
  const diff = before !== null && after !== null ? after - before : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: AdjustmentFormErrors = {};
    if (!siteId) next.siteId = "Site wajib dipilih.";
    if (!itemId) next.itemId = "Item wajib dipilih.";
    if (physical.trim() === "" || Number.isNaN(Number(physical))) {
      next.physicalCount = "Jumlah fisik harus berupa angka.";
    } else if (!Number.isInteger(Number(physical)) || Number(physical) < 0) {
      next.physicalCount = "Jumlah fisik harus bilangan bulat ≥ 0.";
    } else if (diff === 0) {
      next.physicalCount = "Tidak ada selisih untuk disesuaikan.";
    }
    if (!reason) next.reason = "Alasan wajib dipilih.";

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    onSubmit({
      siteId,
      itemId,
      physicalCount: Number(physical),
      reason: reason as AdjustmentReason,
      note: note.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Site" error={errors.siteId} required>
          <Select
            value={siteId}
            onValueChange={(v) => {
              setSiteId(v);
              clearError("siteId");
            }}
            placeholder="Pilih site"
            options={sites.map((s) => ({ value: s.id, label: s.name }))}
            className="w-full"
          />
        </Field>
        <Field label="Alasan" error={errors.reason} required>
          <Select
            value={reason}
            onValueChange={(v) => {
              setReason(v as AdjustmentReason);
              clearError("reason");
            }}
            placeholder="Pilih alasan"
            options={ADJUSTMENT_REASONS.map((r) => ({ value: r, label: r }))}
            className="w-full"
          />
        </Field>
      </div>

      <Field label="Item" error={errors.itemId} required>
        <Select
          value={itemId}
          onValueChange={(v) => {
            setItemId(v);
            clearError("itemId");
          }}
          placeholder="Pilih item"
          options={items.map((i) => ({
            value: i.id,
            label: `${i.itemCode} — ${i.description}`,
          }))}
          className="w-full"
        />
      </Field>

      <Field label="Jumlah Fisik (Opname)" error={errors.physicalCount} required>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          value={physical}
          onChange={(e) => {
            setPhysical(e.target.value);
            clearError("physicalCount");
          }}
          placeholder="0"
        />
      </Field>

      {before !== null && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-muted/50 px-3 py-2 text-xs">
          <span>
            Stok sistem:{" "}
            <span className="font-semibold text-foreground">{before}</span>
          </span>
          {after !== null && (
            <>
              <span>
                Jumlah fisik:{" "}
                <span className="font-semibold text-foreground">{after}</span>
              </span>
              <span>
                Selisih:{" "}
                <span
                  className={cn(
                    "font-semibold",
                    diff! > 0
                      ? "text-emerald-600"
                      : diff! < 0
                        ? "text-destructive"
                        : "text-foreground",
                  )}
                >
                  {diff! > 0 ? `+${diff}` : diff}
                </span>
              </span>
            </>
          )}
        </div>
      )}

      <Field label="Keterangan (opsional)">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan tambahan…"
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
