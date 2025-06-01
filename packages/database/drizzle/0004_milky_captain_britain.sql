ALTER TABLE "users" ADD COLUMN "locale" varchar(10) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;