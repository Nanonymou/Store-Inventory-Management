CREATE TYPE "public"."transfer_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "stock_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_date" date NOT NULL,
	"item_id" uuid NOT NULL,
	"from_site_id" uuid NOT NULL,
	"to_site_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"status" "transfer_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"requested_by" uuid,
	"checked_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_item_id_master_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."master_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_site_id_sites_id_fk" FOREIGN KEY ("from_site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_site_id_sites_id_fk" FOREIGN KEY ("to_site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_checked_by_users_id_fk" FOREIGN KEY ("checked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_stock_transfers_from_site" ON "stock_transfers" USING btree ("from_site_id");--> statement-breakpoint
CREATE INDEX "idx_stock_transfers_to_site" ON "stock_transfers" USING btree ("to_site_id");--> statement-breakpoint
CREATE INDEX "idx_stock_transfers_item" ON "stock_transfers" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_stock_transfers_date" ON "stock_transfers" USING btree ("transfer_date");--> statement-breakpoint
CREATE INDEX "idx_stock_transfers_status" ON "stock_transfers" USING btree ("status");