ALTER TABLE "vagas" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "vagas" ADD COLUMN "state" text;--> statement-breakpoint
CREATE INDEX "vagas_city_idx" ON "vagas" USING btree ("city");--> statement-breakpoint
CREATE INDEX "vagas_state_idx" ON "vagas" USING btree ("state");