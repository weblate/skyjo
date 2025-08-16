ALTER TABLE "user_verifications" DROP CONSTRAINT "user_verifications_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_verifications" ADD COLUMN "email" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email_verified";--> statement-breakpoint
ALTER TABLE "user_verifications" DROP COLUMN "user_id";