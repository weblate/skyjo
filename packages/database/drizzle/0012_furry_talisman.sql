ALTER TABLE "players" ADD COLUMN "forfeited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "forfeited_at" timestamp;