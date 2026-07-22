/** Status of a stock transfer between sites. */
export type TransferStatus = "approved" | "pending" | "rejected";

/** A stock transfer record (mock shape mirrors the future transfers table). */
export interface StockTransfer {
  id: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  itemCode: string;
  itemDescription: string;
  fromSite: string;
  toSite: string;
  quantity: number;
  status: TransferStatus;
  /** Who reviewed/approved the transfer. */
  checkedBy: string;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** A spread of mock transfers across sites, items, and statuses. */
export const MOCK_TRANSFERS: StockTransfer[] = [
  {
    id: "tf-01",
    date: daysAgo(0),
    itemCode: "FRZ-001",
    itemDescription: "Beef Sirloin",
    fromSite: "Site A",
    toSite: "Site C",
    quantity: 12,
    status: "approved",
    checkedBy: "Admin Pusat",
  },
  {
    id: "tf-02",
    date: daysAgo(1),
    itemCode: "DRY-005",
    itemDescription: "Cooking Oil",
    fromSite: "Site B",
    toSite: "Site A",
    quantity: 6,
    status: "pending",
    checkedBy: "—",
  },
  {
    id: "tf-03",
    date: daysAgo(2),
    itemCode: "VEG-001",
    itemDescription: "Tomato Fresh",
    fromSite: "Site E",
    toSite: "Site D",
    quantity: 20,
    status: "approved",
    checkedBy: "Admin Pusat",
  },
  {
    id: "tf-04",
    date: daysAgo(3),
    itemCode: "CHM-001",
    itemDescription: "Dishwash Liquid",
    fromSite: "Site A",
    toSite: "Site F",
    quantity: 8,
    status: "rejected",
    checkedBy: "Admin Pusat",
  },
  {
    id: "tf-05",
    date: daysAgo(4),
    itemCode: "FRZ-002",
    itemDescription: "Chicken Breast",
    fromSite: "Site C",
    toSite: "Site B",
    quantity: 15,
    status: "approved",
    checkedBy: "Admin Pusat",
  },
  {
    id: "tf-06",
    date: daysAgo(6),
    itemCode: "DRY-001",
    itemDescription: "Fresh Milk UHT",
    fromSite: "Site G",
    toSite: "Site H",
    quantity: 24,
    status: "approved",
    checkedBy: "Admin Pusat",
  },
];

/** Indonesian label + tone for a transfer status. */
export function transferStatusMeta(status: TransferStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "approved":
      return { label: "Disetujui", className: "bg-emerald-500/10 text-emerald-700" };
    case "pending":
      return { label: "Menunggu", className: "bg-amber-500/10 text-amber-700" };
    case "rejected":
      return { label: "Ditolak", className: "bg-destructive/10 text-destructive" };
  }
}
