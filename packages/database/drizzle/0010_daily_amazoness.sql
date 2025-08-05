CREATE TYPE "public"."report_reason" AS ENUM('inappropriate-username', 'toxic-behavior', 'spam-advertising', 'cheating-exploiting', 'harassment', 'other');--> statement-breakpoint
ALTER TABLE "reports" RENAME COLUMN "human_validation" TO "validation";--> statement-breakpoint
ALTER TABLE "reports" RENAME COLUMN "reason_by_mod" TO "moderator_comment";--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "guest_id" varchar(255);--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "reason" "report_reason" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "comment" varchar(500);--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN "ai_validation";