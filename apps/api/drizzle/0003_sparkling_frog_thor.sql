ALTER TABLE "users" ALTER COLUMN "user_tag" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "user_tag_idx" ON "users" USING btree ("user_tag");