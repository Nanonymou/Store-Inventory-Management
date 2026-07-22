import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Indonesian Rupiah, e.g. 15000 -> "Rp 15.000". */
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format a plain number with thousand separators, e.g. 15000 -> "15.000". */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}
