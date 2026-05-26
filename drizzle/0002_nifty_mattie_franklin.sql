ALTER TABLE "grupos_Whatsaap" ALTER COLUMN "whatsaapId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "vagas" ALTER COLUMN "salary" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "mensagens" ADD COLUMN "tipo_mensagem" text;--> statement-breakpoint
ALTER TABLE "mensagens" ADD COLUMN "processed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "mensagens" ADD COLUMN "is_job" boolean;--> statement-breakpoint
ALTER TABLE "vagas" ADD COLUMN "message" text;--> statement-breakpoint
ALTER TABLE "vagas" ADD COLUMN "mensagem_id" integer;--> statement-breakpoint
ALTER TABLE "vagas" ADD COLUMN "group_name" text;--> statement-breakpoint
ALTER TABLE "vagas" ADD COLUMN "is_job" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "vagas" ADD COLUMN "processed_by_ai" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "vagas" ADD COLUMN "published_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "vagas" ADD CONSTRAINT "vagas_mensagem_id_mensagens_id_fk" FOREIGN KEY ("mensagem_id") REFERENCES "public"."mensagens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grupos_whatsapp_active_idx" ON "grupos_Whatsaap" USING btree ("active");--> statement-breakpoint
CREATE INDEX "mensagens_processed_idx" ON "mensagens" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "mensagens_is_job_idx" ON "mensagens" USING btree ("is_job");--> statement-breakpoint
CREATE INDEX "vagas_category_idx" ON "vagas" USING btree ("category");--> statement-breakpoint
CREATE INDEX "vagas_location_idx" ON "vagas" USING btree ("location");--> statement-breakpoint
ALTER TABLE "vagas" DROP COLUMN "mensagem";--> statement-breakpoint
ALTER TABLE "vagas" DROP COLUMN "group";--> statement-breakpoint
ALTER TABLE "vagas" DROP COLUMN "publishAt";