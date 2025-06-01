ALTER TABLE "games" ADD COLUMN "settings" json;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "finished_at" timestamp with time zone DEFAULT now() NOT NULL;