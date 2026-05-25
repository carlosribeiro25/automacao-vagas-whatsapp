ALTER TABLE "mensagens" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "vagas" ALTER COLUMN "publishAt" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "vagas" ALTER COLUMN "publishAt" SET DEFAULT now();