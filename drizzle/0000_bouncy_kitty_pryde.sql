CREATE TABLE "grupos_Whatsaap" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "grupos_Whatsaap_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"whatsaapId" integer NOT NULL,
	"description" text,
	"active" boolean DEFAULT true,
	"creatAt" timestamp with time zone DEFAULT now(),
	"updateAt" timestamp with time zone DEFAULT now(),
	CONSTRAINT "grupos_Whatsaap_whatsaapId_unique" UNIQUE("whatsaapId")
);
--> statement-breakpoint
CREATE TABLE "mensagens" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mensagens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"grupo_id" integer,
	"autor" text,
	"conteudo" text,
	"data" timestamp,
	"imagem_url" text,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"picture" text,
	"password" text NOT NULL,
	"creatAt" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_name_length_check" CHECK (length("users"."name") >= 4)
);
--> statement-breakpoint
CREATE TABLE "vagas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vagas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text,
	"mensagem" text,
	"tipo_vaga" text,
	"description" text,
	"category" text,
	"company" text,
	"texto_extraido" text,
	"imagem_original_url" text,
	"requirements" text,
	"modality" text,
	"salary" numeric,
	"benefits" text,
	"group" text,
	"contact" text,
	"link" text,
	"location" text,
	"publishAt" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_grupo_id_grupos_Whatsaap_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos_Whatsaap"("id") ON DELETE no action ON UPDATE no action;