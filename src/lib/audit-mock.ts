import type { UserRole } from "./types";

/** A displayable audit log entry (mock shape mirrors the audit_logs table). */
export interface AuditLogEntry {
  id: string;
  userName: string;
  userRole: UserRole;
  /** Machine action key, e.g. "create", "update", "delete", "login". */
  action: string;
  resourceTarget: string;
  detail: string;
  /** ISO timestamp. */
  createdAt: string;
}

function iso(daysAgo: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** A spread of mock audit entries across users, actions, and days. */
export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "log-01",
    userName: "Admin Pusat",
    userRole: "admin",
    action: "create",
    resourceTarget: "master_item:FRZ-004",
    detail: 'Menambah item "Beef Tenderloin".',
    createdAt: iso(0, 8, 12),
  },
  {
    id: "log-02",
    userName: "Budi (Storeman Site A)",
    userRole: "storeman",
    action: "save_daily_stock",
    resourceTarget: "daily_stock:Site A",
    detail: "Menyimpan 10 entri transaksi harian.",
    createdAt: iso(0, 8, 45),
  },
  {
    id: "log-03",
    userName: "Admin Pusat",
    userRole: "admin",
    action: "update",
    resourceTarget: "master_item:DRY-002",
    detail: "Mengubah harga dari Rp 240.000 menjadi Rp 245.000.",
    createdAt: iso(0, 9, 20),
  },
  {
    id: "log-04",
    userName: "Siti (Storeman Site C)",
    userRole: "storeman",
    action: "login",
    resourceTarget: "session",
    detail: "Login berhasil.",
    createdAt: iso(1, 7, 58),
  },
  {
    id: "log-05",
    userName: "Admin Pusat",
    userRole: "admin",
    action: "delete",
    resourceTarget: "master_item:CHM-009",
    detail: "Menghapus item yang tidak lagi dipasok.",
    createdAt: iso(1, 10, 5),
  },
  {
    id: "log-06",
    userName: "Budi (Storeman Site A)",
    userRole: "storeman",
    action: "access_denied",
    resourceTarget: "master_items:create",
    detail: "Akses khusus Admin.",
    createdAt: iso(1, 11, 30),
  },
  {
    id: "log-07",
    userName: "Admin Pusat",
    userRole: "admin",
    action: "update",
    resourceTarget: "daily_stock:Site C",
    detail: "Revisi transaksi tanggal lampau.",
    createdAt: iso(2, 14, 15),
  },
  {
    id: "log-08",
    userName: "Rina (Storeman Site E)",
    userRole: "storeman",
    action: "save_daily_stock",
    resourceTarget: "daily_stock:Site E",
    detail: "Menyimpan 8 entri transaksi harian.",
    createdAt: iso(2, 16, 40),
  },
  {
    id: "log-09",
    userName: "Admin Pusat",
    userRole: "admin",
    action: "create",
    resourceTarget: "user:storeman.f@stokman.test",
    detail: "Membuat akun Storeman untuk Site F.",
    createdAt: iso(3, 9, 0),
  },
  {
    id: "log-10",
    userName: "Siti (Storeman Site C)",
    userRole: "storeman",
    action: "logout",
    resourceTarget: "session",
    detail: "Logout dari aplikasi.",
    createdAt: iso(3, 17, 10),
  },
  {
    id: "log-11",
    userName: "Admin Pusat",
    userRole: "admin",
    action: "adjust_stock",
    resourceTarget: "stock_adjustment:adj-01",
    detail: "Penyesuaian (Rusak): 40 → 38.",
    createdAt: iso(0, 9, 40),
  },
  {
    id: "log-12",
    userName: "Admin Pusat",
    userRole: "admin",
    action: "create_transfer",
    resourceTarget: "transfer:tf-01",
    detail: "Transfer 12 unit antar site (menunggu persetujuan).",
    createdAt: iso(0, 10, 15),
  },
  {
    id: "log-13",
    userName: "Anonim",
    userRole: "storeman",
    action: "login_failed",
    resourceTarget: "session",
    detail: "Percobaan login gagal untuk email: unknown@stokman.test",
    createdAt: iso(1, 6, 20),
  },
];
