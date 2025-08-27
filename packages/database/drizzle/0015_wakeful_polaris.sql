CREATE TYPE "public"."penalty_type" AS ENUM('leavebuster', 'chat_restrict', 'tempban', 'ban');--> statement-breakpoint
CREATE TABLE "penalties" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"guest_id" varchar(255),
	"report_id" integer,
	"type" "penalty_type" NOT NULL,
	"level" integer,
	"reason" text NOT NULL,
	"completions_required" integer,
	"completions_done" integer DEFAULT 0,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "guest_id" varchar(255);--> statement-breakpoint
ALTER TABLE "penalties" ADD CONSTRAINT "penalties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penalties" ADD CONSTRAINT "penalties_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "penalties_user_idx" ON "penalties" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "penalties_guest_idx" ON "penalties" USING btree ("guest_id");