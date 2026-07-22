import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  dailyStock,
  itemSections,
  masterItems,
  sites,
  users,
} from "./schema";
import { hashPassword } from "../lib/auth/password";

/**
 * Seed the database with reference data and demo accounts so the app is usable
 * end to end. Idempotent: existing rows (matched on unique keys) are skipped.
 *
 *   npm run db:seed
 */

const SECTIONS = [
  "Frozen",
  "Dry Goods & Dairy",
  "Fresh Vegetable & Fruits",
  "Chemical & Consumable",
] as const;

const SITES = [
  { name: "Site A", location: "Jakarta Pusat" },
  { name: "Site B", location: "Jakarta Barat" },
  { name: "Site C", location: "Jakarta Selatan" },
  { name: "Site D", location: "Jakarta Timur" },
  { name: "Site E", location: "Jakarta Utara" },
  { name: "Site F", location: "Bekasi" },
  { name: "Site G", location: "Depok" },
  { name: "Site H", location: "Tangerang" },
  { name: "Site I", location: "Bogor" },
  { name: "Site J", location: "Bandung" },
  { name: "Site K", location: "Surabaya" },
];

const ITEMS = [
  { code: "FRZ-001", desc: "Beef Sirloin", brand: "AngusPro", size: "1 kg", unit: "Kg", price: 185000, section: "Frozen" },
  { code: "FRZ-002", desc: "Chicken Breast", brand: "Poultry Farm", size: "1 kg", unit: "Kg", price: 45000, section: "Frozen" },
  { code: "FRZ-003", desc: "Dory Fillet", brand: "SeaFresh", size: "500 g", unit: "Pack", price: 38000, section: "Frozen" },
  { code: "DRY-001", desc: "Fresh Milk UHT", brand: "DairyGold", size: "1 L", unit: "Ctn", price: 21000, section: "Dry Goods & Dairy" },
  { code: "DRY-002", desc: "All-Purpose Flour", brand: "MillStone", size: "25 kg", unit: "Sack", price: 245000, section: "Dry Goods & Dairy" },
  { code: "DRY-003", desc: "Cooking Oil", brand: "GoldenPalm", size: "18 L", unit: "Jerry", price: 315000, section: "Dry Goods & Dairy" },
  { code: "VEG-001", desc: "Tomato Fresh", brand: "Local Farm", size: "1 kg", unit: "Kg", price: 18000, section: "Fresh Vegetable & Fruits" },
  { code: "VEG-002", desc: "Apple Fuji", brand: "Import", size: "1 kg", unit: "Kg", price: 42000, section: "Fresh Vegetable & Fruits" },
  { code: "CHM-001", desc: "Dishwash Liquid", brand: "CleanPro", size: "5 L", unit: "Jerry", price: 65000, section: "Chemical & Consumable" },
  { code: "CHM-002", desc: "Hand Soap Refill", brand: "HygienePlus", size: "1 L", unit: "Btl", price: 28000, section: "Chemical & Consumable" },
];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function main() {
  console.log("Seeding database…");

  // Sections
  await db
    .insert(itemSections)
    .values(SECTIONS.map((name) => ({ name })))
    .onConflictDoNothing();
  const sectionRows = await db.select().from(itemSections);
  const sectionId = new Map(sectionRows.map((s) => [s.name, s.id]));

  // Sites
  await db.insert(sites).values(SITES).onConflictDoNothing();
  const siteRows = await db.select().from(sites);
  const siteId = new Map(siteRows.map((s) => [s.name, s.id]));

  // Master items
  await db
    .insert(masterItems)
    .values(
      ITEMS.map((i) => ({
        itemCode: i.code,
        description: i.desc,
        brand: i.brand,
        size: i.size,
        unit: i.unit,
        price: i.price,
        sectionId: sectionId.get(i.section)!,
      })),
    )
    .onConflictDoNothing();
  const itemRows = await db.select().from(masterItems);

  // Users (admin + two storemen). Passwords meet the 8-char letter+digit policy.
  const [adminHash, storemanAHash, storemanBHash] = await Promise.all([
    hashPassword("admin123"),
    hashPassword("storeman123"),
    hashPassword("storeman123"),
  ]);
  await db
    .insert(users)
    .values([
      {
        name: "Admin Pusat",
        email: "admin@stokman.test",
        passwordHash: adminHash,
        role: "admin",
        siteId: null,
        mustChangePassword: 0,
      },
      {
        name: "Budi (Storeman Site A)",
        email: "storeman.a@stokman.test",
        passwordHash: storemanAHash,
        role: "storeman",
        siteId: siteId.get("Site A")!,
        mustChangePassword: 0,
      },
      {
        name: "Siti (Storeman Site B)",
        email: "storeman.b@stokman.test",
        passwordHash: storemanBHash,
        role: "storeman",
        siteId: siteId.get("Site B")!,
        mustChangePassword: 0,
      },
    ])
    .onConflictDoNothing();

  // Seed today's stock for Site A so there is data to view and transfer/adjust.
  const siteAId = siteId.get("Site A")!;
  await db
    .insert(dailyStock)
    .values(
      itemRows.map((item, idx) => {
        const beg = 40 + ((idx * 7) % 60);
        const receiving = (idx * 3) % 20;
        const regular = (idx * 2) % 10;
        return {
          recordDate: todayISO(),
          itemId: item.id,
          siteId: siteAId,
          begBalance: beg,
          receiving,
          regular,
          balance: beg + receiving - regular,
        };
      }),
    )
    .onConflictDoNothing();

  const counts = {
    sections: sectionRows.length,
    sites: siteRows.length,
    items: itemRows.length,
    users: (await db.select({ id: users.id }).from(users)).length,
    dailyStock: (
      await db
        .select({ id: dailyStock.id })
        .from(dailyStock)
        .where(eq(dailyStock.siteId, siteAId))
    ).length,
  };
  console.log("Seed complete:", counts);
  console.log("Login: admin@stokman.test / admin123");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
