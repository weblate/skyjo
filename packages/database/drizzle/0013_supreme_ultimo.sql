ALTER TABLE "games" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "games" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "games" ALTER COLUMN "finished_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "games" ALTER COLUMN "finished_at" SET DEFAULT now();