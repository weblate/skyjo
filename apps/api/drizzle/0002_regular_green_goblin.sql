ALTER TABLE "users" ALTER COLUMN "user_tag" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "facebook_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_google_id_unique" UNIQUE("google_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_facebook_id_unique" UNIQUE("facebook_id");