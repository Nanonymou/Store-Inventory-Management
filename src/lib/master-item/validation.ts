import { ITEM_SECTIONS, type ItemSection, type MasterItem } from "@/lib/types";

/** Raw form values for creating/editing a master item. */
export interface ItemFormValues {
  itemCode: string;
  description: string;
  brand: string;
  size: string;
  unit: string;
  price: string;
  section: ItemSection | "";
}

export type ItemFormErrors = Partial<Record<keyof ItemFormValues, string>>;

export const EMPTY_ITEM_FORM: ItemFormValues = {
  itemCode: "",
  description: "",
  brand: "",
  size: "",
  unit: "",
  price: "",
  section: "",
};

interface ValidateOptions {
  /** Existing item codes to check duplicates against (any casing). */
  existingCodes: string[];
  /** When editing, the item's own code is excluded from the duplicate check. */
  ownCode?: string;
}

/**
 * Validate item form values. Enforces required fields, a non-negative numeric
 * price, a valid section, and — crucially — a locally-unique Item Code
 * (case-insensitive). Pure so it can back both the form and, later, the server.
 */
export function validateItemForm(
  values: ItemFormValues,
  { existingCodes, ownCode }: ValidateOptions,
): ItemFormErrors {
  const errors: ItemFormErrors = {};

  const code = values.itemCode.trim();
  if (!code) {
    errors.itemCode = "Item Code wajib diisi.";
  } else {
    const normalized = code.toLowerCase();
    const own = ownCode?.trim().toLowerCase();
    const isDuplicate = existingCodes
      .map((c) => c.trim().toLowerCase())
      .some((c) => c === normalized && c !== own);
    if (isDuplicate) {
      errors.itemCode = `Item Code "${code}" sudah dipakai.`;
    }
  }

  if (!values.description.trim()) {
    errors.description = "Description wajib diisi.";
  }

  const price = Number(values.price);
  if (values.price.trim() === "" || Number.isNaN(price)) {
    errors.price = "Price harus berupa angka.";
  } else if (price < 0) {
    errors.price = "Price tidak boleh negatif.";
  }

  if (!values.section) {
    errors.section = "Section wajib dipilih.";
  } else if (!ITEM_SECTIONS.includes(values.section)) {
    errors.section = "Section tidak valid.";
  }

  return errors;
}

export function hasErrors(errors: ItemFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Convert an existing master item into editable form values. */
export function itemToFormValues(item: MasterItem): ItemFormValues {
  return {
    itemCode: item.itemCode,
    description: item.description,
    brand: item.brand ?? "",
    size: item.size ?? "",
    unit: item.unit ?? "",
    price: String(item.price),
    section: item.section,
  };
}
