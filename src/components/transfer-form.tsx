"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  /**
   * Optional resolver for the available stock of an item at a site. When
   * provided, the form shows the origin's availability as the item is chosen.
   */
  getAvailableStock?: (siteId: string, itemId: string) => number;
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
  getAvailableStock,
}: TransferFormProps) {
  const [fromSiteId, setFromSiteId] = React.useState("");
  const [toSiteId, setToSiteId] = React.useState("");
  const [itemId, setItemId] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [errors, setErrors] = React.useState<TransferFormErrors>({});

  const clearError = (key: keyof TransferFormValues) =>
    setErrors((prev) => ({ ...prev, [key]: undefined }));

  const fromSite = sites.find((s) => s.id === fromSiteId);
  const toSite = sites.find((s) => s.id === toSiteId);
  const item = items.find((i) => i.id === itemId);

  // Available stock at the origin for the chosen item (when a resolver is set).
  const available =
    getAvailableStock && fromSiteId && itemId
      ? getAvailableStock(fromSiteId, itemId)
      : null;

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

  const toOption = (s: Site) => ({
    value: s.id,
    label: `${s.name} — ${s.location}`,
  });
  // Keep origin and destination mutually exclusive in the dropdowns.
  const originOptions = sites.filter((s) => s.id !== toSiteId).map(toOption);
  const destinationOptions = sites
    .filter((s) => s.id !== fromSiteId)
    .map(toOption);

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
            options={originOptions}
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
            options={destinationOptions}
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

      {available !== null &&
        (() => {
          const exceeded =
            quantity.trim() !== "" && Number(quantity) > available;
          return (
            <p
              className={cn(
                "text-xs",
                exceeded ? "text-destructive" : "text-muted-foreground",
              )}
            >
              Stok tersedia di{" "}
              <span className="font-medium text-foreground">
                {fromSite?.name}
              </span>{" "}
              untuk item ini:{" "}
              <span className="font-semibold text-foreground">{available}</span>
              {exceeded && " — melebihi stok yang tersedia."}
            </p>
          );
        })()}

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

      {fromSite && toSite && item && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-muted/50 px-3 py-2 text-xs">
          <span className="font-medium">{item.itemCode}</span>
          <span className="text-muted-foreground">·</span>
          <span>{fromSite.name}</span>
          <ArrowRight className="size-3 text-muted-foreground" />
          <span>{toSite.name}</span>
          {quantity && Number(quantity) > 0 && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium">{Number(quantity)} unit</span>
            </>
          )}
        </div>
      )}

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
