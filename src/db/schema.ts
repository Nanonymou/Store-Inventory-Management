import { relations } from "drizzle-orm";
import {
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Database schema (Drizzle ORM / PostgreSQL).
 *
 * The daily transaction feature centres on `daily_stock`, which records one row
 * per item per site per date. It references `master_items` and `sites`, so
 * those parent tables — and the `item_sections` / `users` they depend on — are
 * defined here too. `audit_logs` captures activity across the app.
 */

/** Access roles: a site-bound Storeman or a global Admin. */
export const userRole = pgEnum("user_role", ["admin", "storeman"]);

/** Lifecycle status of an inter-site stock transfer. */
export const transferStatus = pgEnum("transfer_status", [
  "pending",
  "approved",
  "rejected",
]);

/** Item catalog sections (the four PRD groupings). */
export const itemSections = pgTable("item_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull().unique(),
});

/** The 11 storage locations. */
export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  location: varchar("location", { length: 200 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Application users. A Storeman is bound to exactly one site; Admin is null. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("storeman"),
  siteId: uuid("site_id").references(() => sites.id, { onDelete: "set null" }),
  /** Forces a password change on next login (temporary password). */
  mustChangePassword: integer("must_change_password").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * User ↔ site assignments. A Storeman's primary binding is `users.site_id`;
 * this join table records the sites a user may access (one row per site),
 * keeping the model open to multi-site assignment without changing the primary
 * binding. The (user, site) pair is unique.
 */
export const userSite = pgTable(
  "user_site",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uqUserSite: unique("uq_user_site").on(t.userId, t.siteId),
    userIdx: index("idx_user_site_user").on(t.userId),
    siteIdx: index("idx_user_site_site").on(t.siteId),
  }),
);

/** Master item catalog (Admin-managed). */
export const masterItems = pgTable(
  "master_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemCode: varchar("item_code", { length: 60 }).notNull().unique(),
    description: varchar("description", { length: 240 }).notNull(),
    brand: varchar("brand", { length: 120 }),
    size: varchar("size", { length: 60 }),
    unit: varchar("unit", { length: 40 }),
    price: doublePrecision("price").notNull().default(0),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => itemSections.id, { onDelete: "restrict" }),
    /** Soft-delete flag so historical stock rows keep referencing the item. */
    isActive: integer("is_active").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // Speeds up section filtering and the "active catalog" listing.
    sectionIdx: index("idx_master_items_section").on(t.sectionId),
    activeIdx: index("idx_master_items_active").on(t.isActive),
  }),
);

/**
 * Daily stock — the heart of the daily transaction feature. One row per
 * (record_date, item, site) holding all movement quantities and the derived
 * balance. Uniqueness on that triple prevents duplicate entries for a day.
 */
export const dailyStock = pgTable(
  "daily_stock",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recordDate: date("record_date").notNull(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => masterItems.id, { onDelete: "restrict" }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),

    // Movement columns (quantities).
    begBalance: integer("beg_balance").notNull().default(0),
    receiving: integer("receiving").notNull().default(0),
    regular: integer("regular").notNull().default(0),
    snack: integer("snack").notNull().default(0),
    backcharge: integer("backcharge").notNull().default(0),
    hkl: integer("hkl").notNull().default(0),
    event: integer("event").notNull().default(0),
    ent: integer("ent").notNull().default(0),
    toQty: integer("to_qty").notNull().default(0),
    spoil: integer("spoil").notNull().default(0),

    /** Derived: beg + receiving − (regular + snack + … + spoil). Stored for reporting. */
    balance: integer("balance").notNull().default(0),

    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uqDayItemSite: unique("uq_daily_stock_day_item_site").on(
      t.recordDate,
      t.itemId,
      t.siteId,
    ),
    // Primary access pattern: all rows for a site on a given date.
    siteDateIdx: index("idx_daily_stock_site_date").on(t.siteId, t.recordDate),
    itemIdx: index("idx_daily_stock_item").on(t.itemId),
  }),
);

/**
 * Inter-site stock transfers. Records a movement of one item from an origin site
 * to a destination site, its quantity, review status, and the users who
 * requested and checked it. On approval the stock at both sites is adjusted
 * (applied by the service, not this schema).
 */
export const stockTransfers = pgTable(
  "stock_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transferDate: date("transfer_date").notNull(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => masterItems.id, { onDelete: "restrict" }),
    fromSiteId: uuid("from_site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "restrict" }),
    toSiteId: uuid("to_site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    status: transferStatus("status").notNull().default("pending"),
    note: text("note"),
    requestedBy: uuid("requested_by").references(() => users.id, {
      onDelete: "set null",
    }),
    checkedBy: uuid("checked_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    fromSiteIdx: index("idx_stock_transfers_from_site").on(t.fromSiteId),
    toSiteIdx: index("idx_stock_transfers_to_site").on(t.toSiteId),
    itemIdx: index("idx_stock_transfers_item").on(t.itemId),
    dateIdx: index("idx_stock_transfers_date").on(t.transferDate),
    statusIdx: index("idx_stock_transfers_status").on(t.status),
  }),
);

/** Audit trail of user activity (create / update / delete / access). */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 60 }).notNull(),
    resourceTarget: varchar("resource_target", { length: 240 }).notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // Query patterns: newest-first ordering and filtering by user / action.
    createdIdx: index("idx_audit_logs_created").on(t.createdAt),
    userIdx: index("idx_audit_logs_user").on(t.userId),
    actionIdx: index("idx_audit_logs_action").on(t.action),
  }),
);

/* --------------------------------------------------------------------------
 * Relations — enable type-safe joins (e.g. loading an item with its section).
 * These are ORM-level only and do not alter the SQL schema.
 * ------------------------------------------------------------------------ */

export const itemSectionsRelations = relations(itemSections, ({ many }) => ({
  items: many(masterItems),
}));

export const masterItemsRelations = relations(masterItems, ({ one, many }) => ({
  section: one(itemSections, {
    fields: [masterItems.sectionId],
    references: [itemSections.id],
  }),
  dailyStock: many(dailyStock),
}));

export const sitesRelations = relations(sites, ({ many }) => ({
  users: many(users),
  dailyStock: many(dailyStock),
  userSites: many(userSite),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  site: one(sites, {
    fields: [users.siteId],
    references: [sites.id],
  }),
  auditLogs: many(auditLogs),
  userSites: many(userSite),
}));

export const userSiteRelations = relations(userSite, ({ one }) => ({
  user: one(users, {
    fields: [userSite.userId],
    references: [users.id],
  }),
  site: one(sites, {
    fields: [userSite.siteId],
    references: [sites.id],
  }),
}));

export const dailyStockRelations = relations(dailyStock, ({ one }) => ({
  item: one(masterItems, {
    fields: [dailyStock.itemId],
    references: [masterItems.id],
  }),
  site: one(sites, {
    fields: [dailyStock.siteId],
    references: [sites.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const stockTransfersRelations = relations(stockTransfers, ({ one }) => ({
  item: one(masterItems, {
    fields: [stockTransfers.itemId],
    references: [masterItems.id],
  }),
  fromSite: one(sites, {
    fields: [stockTransfers.fromSiteId],
    references: [sites.id],
  }),
  toSite: one(sites, {
    fields: [stockTransfers.toSiteId],
    references: [sites.id],
  }),
  requester: one(users, {
    fields: [stockTransfers.requestedBy],
    references: [users.id],
  }),
  checker: one(users, {
    fields: [stockTransfers.checkedBy],
    references: [users.id],
  }),
}));

export type ItemSectionRow = typeof itemSections.$inferSelect;
export type SiteRow = typeof sites.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type UserSiteRow = typeof userSite.$inferSelect;
export type MasterItemRow = typeof masterItems.$inferSelect;
export type NewMasterItemRow = typeof masterItems.$inferInsert;
export type DailyStockRow = typeof dailyStock.$inferSelect;
export type NewDailyStockRow = typeof dailyStock.$inferInsert;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type StockTransferRow = typeof stockTransfers.$inferSelect;
export type NewStockTransferRow = typeof stockTransfers.$inferInsert;
