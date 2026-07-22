CREATE INDEX "idx_daily_stock_site_date" ON "daily_stock" USING btree ("site_id","record_date");--> statement-breakpoint
CREATE INDEX "idx_daily_stock_item" ON "daily_stock" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_master_items_section" ON "master_items" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "idx_master_items_active" ON "master_items" USING btree ("is_active");