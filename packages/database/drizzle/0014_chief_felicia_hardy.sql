-- Remove emailVerified column from users table
ALTER TABLE "users" DROP COLUMN "email_verified";

-- Drop existing user_verifications table and recreate with email instead of user_id
DROP TABLE "user_verifications";

CREATE TABLE "user_verifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" varchar(255) NOT NULL,
  "pin" varchar(6) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL
);