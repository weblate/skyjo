CREATE TYPE "public"."role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "role" DEFAULT 'USER' NOT NULL;