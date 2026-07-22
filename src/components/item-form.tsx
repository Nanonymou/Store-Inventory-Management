"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ITEM_SECTIONS, type ItemSection } from "@/lib/types";
import {
  EMPTY_ITEM_FORM,
  hasErrors,
  validateItemForm,
  type ItemFormErrors,
  type ItemFormValues,
} from "@/lib/master-item/validation";

interface ItemFormProps {
  /** Existing item codes for the local duplicate-code check. */
  existingCodes: string[];
  /** When editing, the item's own code is excluded from duplicate detection. */
  ownCode?: string;
  initial?: ItemFormValues;
  submitLabel?: string;
  onSubmit: (values: ItemFormValues) => void;
  onCancel: () => void;
}

/**
 * Add/edit form for a master item. Validates on submit (and clears a field's
 * error as it's corrected), enforcing required fields, a numeric price, and a
 * locally-unique Item Code.
 */
export function ItemForm({
  existingCodes,
  ownCode,
  initial,
  submitLabel = "Simpan",
  onSubmit,
  onCancel,
}: ItemFormProps) {
  const [values, setValues] = React.useState<ItemFormValues>(
    initial ?? EMPTY_ITEM_FORM,
  );
  const [errors, setErrors] = React.useState<ItemFormErrors>({});

  const setField = <K extends keyof ItemFormValues>(
    key: K,
    value: ItemFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateItemForm(values, { existingCodes, ownCode });
    if (hasErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }
    onSubmit({
      ...values,
      itemCode: values.itemCode.trim(),
      description: values.description.trim(),
      brand: values.brand.trim(),
      size: values.size.trim(),
      unit: values.unit.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Item Code" error={errors.itemCode} required>
          <Input
            value={values.itemCode}
            onChange={(e) => setField("itemCode", e.target.value)}
            placeholder="mis. FRZ-004"
            autoFocus
          />
        </Field>
        <Field label="Section" error={errors.section} required>
          <Select
            value={values.section}
            onValueChange={(v) => setField("section", v as ItemSection)}
            placeholder="Pilih section"
            options={ITEM_SECTIONS.map((s) => ({ value: s, label: s }))}
            className="w-full"
          />
        </Field>
      </div>

      <Field label="Description" error={errors.description} required>
        <Input
          value={values.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="mis. Beef Tenderloin"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Brand">
          <Input
            value={values.brand}
            onChange={(e) => setField("brand", e.target.value)}
          />
        </Field>
        <Field label="Size">
          <Input
            value={values.size}
            onChange={(e) => setField("size", e.target.value)}
            placeholder="mis. 1 kg"
          />
        </Field>
        <Field label="Unit">
          <Input
            value={values.unit}
            onChange={(e) => setField("unit", e.target.value)}
            placeholder="mis. Kg"
          />
        </Field>
      </div>

      <Field label="Price (Rp)" error={errors.price} required>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          value={values.price}
          onChange={(e) => setField("price", e.target.value)}
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
