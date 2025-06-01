ALTER TABLE "users" DROP CONSTRAINT "users_username_unique";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "user_tag" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_user_tag_unique" UNIQUE("user_tag");