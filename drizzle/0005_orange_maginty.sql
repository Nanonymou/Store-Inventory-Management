CREATE TABLE "stock_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adjustment_date" date NOT NULL,
	"site_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"before_qty" integer NOT NULL,
	"after_qty" integer NOT NULL,
	"reason" varchar(60) NOT NULL,
	"note" text,
	"adjusted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_item_id_master_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."master_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_adjusted_by_users_id_fk" FOREIGN KEY ("adjusted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_stock_adjustments_site" ON "stock_adjustments" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_stock_adjustments_item" ON "stock_adjustments" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_stock_adjustments_date" ON "stock_adjustments" USING btree ("adjustment_date");--> statement-breakpoint
CREATE INDEX "idx_stock_adjustments_reason" ON "stock_adjustments" USING btree ("reason");