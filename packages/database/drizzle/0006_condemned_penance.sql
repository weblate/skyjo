ALTER TABLE "penalties" RENAME TO "reports";--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "penalties_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;