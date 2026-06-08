CREATE TYPE "public"."whatsapp_connection_status" AS ENUM('pending', 'qr_ready', 'authenticated', 'ready', 'disconnected', 'failed');--> statement-breakpoint
CREATE TABLE "whatsapp_connection_groups" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "whatsapp_connection_groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"connection_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"selected" boolean DEFAULT false,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"update_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_connections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "whatsapp_connections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"status" "whatsapp_connection_status" DEFAULT 'pending' NOT NULL,
	"phone" text,
	"client_key" text NOT NULL,
	"session_key" text,
	"last_qr" text,
	"last_qr_at" timestamp with time zone,
	"connected_at" timestamp with time zone,
	"disconnected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"update_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "whatsapp_connections_client_key_unique" UNIQUE("client_key")
);
--> statement-breakpoint
ALTER TABLE "mensagens" ADD COLUMN "connection_id" integer;--> statement-breakpoint
ALTER TABLE "vagas" ADD COLUMN "connection_id" integer;--> statement-breakpoint
ALTER TABLE "whatsapp_connection_groups" ADD CONSTRAINT "whatsapp_connection_groups_connection_id_whatsapp_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."whatsapp_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_connection_groups" ADD CONSTRAINT "whatsapp_connection_groups_group_id_grupos_Whatsaap_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."grupos_Whatsaap"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "whatsapp_connection_groups_connection_idx" ON "whatsapp_connection_groups" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "whatsapp_connection_groups_selected_idx" ON "whatsapp_connection_groups" USING btree ("selected");--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_connection_groups_connection_group_unique" ON "whatsapp_connection_groups" USING btree ("connection_id","group_id");--> statement-breakpoint
CREATE INDEX "whatsapp_connections_user_idx" ON "whatsapp_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "whatsapp_connections_status_idx" ON "whatsapp_connections" USING btree ("status");--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_connection_id_whatsapp_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."whatsapp_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vagas" ADD CONSTRAINT "vagas_connection_id_whatsapp_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."whatsapp_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mensagens_connection_idx" ON "mensagens" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "vagas_connection_idx" ON "vagas" USING btree ("connection_id");