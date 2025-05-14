ALTER TABLE "users" DROP CONSTRAINT "users_user_tag_unique";--> statement-breakpoint
DROP INDEX "user_tag_idx";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" varchar(20);--> statement-breakpoint
CREATE UNIQUE INDEX "username_idx" ON "users" USING btree ("username");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "user_tag";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");