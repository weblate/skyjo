-- Migration to convert scores.score from varchar to json with data preservation
-- This handles existing string/number data and converts it to proper JSON format

-- Step 1: Add a temporary json column
ALTER TABLE "scores" ADD COLUMN "score_temp" json;

-- Step 2: Convert existing data to JSON format
-- Numbers: convert to JSON number
-- String "-": keep as JSON string
-- Other strings: try to parse as number, fallback to string
UPDATE "scores" SET "score_temp" = 
  CASE 
    WHEN "score" = '-' THEN '"-"'::json
    WHEN "score" ~ '^-?[0-9]+(\.[0-9]+)?$' THEN "score"::numeric::text::json
    ELSE ('"' || "score" || '"')::json
  END;

-- Step 3: Drop the old column
ALTER TABLE "scores" DROP COLUMN "score";

-- Step 4: Rename the temp column to score
ALTER TABLE "scores" RENAME COLUMN "score_temp" TO "score";

-- Step 5: Add NOT NULL constraint
ALTER TABLE "scores" ALTER COLUMN "score" SET NOT NULL;