"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { MasterItem, Site } from "@/lib/types";

export interface TransferFormValues {
  fromSiteId: string;
  toSiteId: string;
  itemId: string;
  quantity: number;
}

export type TransferFormErrors = Partial<
  Record<keyof TransferFormValues, string>
>;

interface TransferFormProps {
  sites: Site[];
  items: MasterItem[];
  submitLabel?: string;
  onSubmit: (values: TransferFormValues) => void;
  onCancel: () => void;
  /**
   * Optional extra validation (e.g. stock availability), run after the base
   * checks pass. Return errors to block submission.
   */
  validateExtra?: (values: TransferFormValues) => TransferFormErrors;
}

/**
 * Stock transfer form: choose origin and destination sites, an item, and a
 * quantity. Enforces base rules (all required, distinct sites, positive
 * quantity); callers can layer on stock-availability validation via
 * `validateExtra`.
 */
export function TransferForm({
  sites,
  items,
  submitLabel = "Simpan",
  onSubmit,
  onCancel,
  validateExtra,
}: TransferFormProps) {
  const [fromSiteId, setFromSiteId] = React.useState("");
  const [toSiteId, setToSiteId] = React.useState("");
  const [itemId, setItemId] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [errors, setErrors] = React.useState<TransferFormErrors>({});

  const clearError = (key: keyof TransferFormValues) =>
    setErrors((prev) => ({ ...prev, [key]: undefined }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    const next: TransferFormErrors = {};

    if (!fromSiteId) next.fromSiteId = "Site asal wajib dipilih.";
    if (!toSiteId) next.toSiteId = "Site tujuan wajib dipilih.";
    if (fromSiteId && toSiteId && fromSiteId === toSiteId) {
      next.toSiteId = "Site tujuan harus berbeda dari asal.";
    }
    if (!itemId) next.itemId = "Item wajib dipilih.";
    if (quantity.trim() === "" || Number.isNaN(qty)) {
      next.quantity = "Jumlah harus berupa angka.";
    } else if (!Number.isInteger(qty) || qty <= 0) {
      next.quantity = "Jumlah harus bilangan bulat lebih dari 0.";
    }

    const values: TransferFormValues = { fromSiteId, toSiteId, itemId, quantity: qty };
    const extra =
      Object.keys(next).length === 0 && validateExtra
        ? validateExtra(values)
        : {};
    const merged = { ...next, ...extra };

    if (Object.keys(merged).length > 0) {
      setErrors(merged);
      return;
    }
    onSubmit(values);
  };

  const siteOptions = sites.map((s) => ({
    value: s.id,
    label: `${s.name} — ${s.location}`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <Field label="Site Asal" error={errors.fromSiteId} required>
          <Select
            value={fromSiteId}
            onValueChange={(v) => {
              setFromSiteId(v);
              clearError("fromSiteId");
            }}
            placeholder="Pilih asal"
            options={siteOptions}
            className="w-full"
          />
        </Field>
        <div className="hidden pb-2 sm:block">
          <ArrowRight className="size-4 text-muted-foreground" />
        </div>
        <Field label="Site Tujuan" error={errors.toSiteId} required>
          <Select
            value={toSiteId}
            onValueChange={(v) => {
              setToSiteId(v);
              clearError("toSiteId");
            }}
            placeholder="Pilih tujuan"
            options={siteOptions}
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

      <Field label="Jumlah (Qty)" error={errors.quantity} required>
        <Input
          type="number"
          min={1}
          inputMode="numeric"
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
            clearError("quantity");
          }}
          placeholder="0"
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
