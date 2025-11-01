ALTER TABLE "players" ADD COLUMN "afk_count" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "consecutive_afk_count" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "disconnected_afk_count" smallint DEFAULT 0 NOT NULL;