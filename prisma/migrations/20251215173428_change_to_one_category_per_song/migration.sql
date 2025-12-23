/*
  Warnings:

  - You are about to drop the `SongCategory` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `categoryId` to the `Song` table without a default value. This is not possible if the table is not empty.

  Data Migration Strategy:
  - Create an UNKNOWN category for songs without categories
  - For songs with multiple categories, we'll keep only the first one
  - This preserves all song data while converting to one-to-one relationship
*/

-- Step 1: Create UNKNOWN category if it doesn't exist
INSERT INTO "Category" ("id", "name")
VALUES (gen_random_uuid(), 'unknown')
ON CONFLICT ("name") DO NOTHING;

-- Step 2: Add categoryId column as nullable first
ALTER TABLE "Song" ADD COLUMN "categoryId" TEXT;

-- Step 3: Migrate data - for each song, pick the first category from SongCategory
UPDATE "Song" 
SET "categoryId" = (
  SELECT "categoryId" 
  FROM "SongCategory" 
  WHERE "SongCategory"."songId" = "Song"."id" 
  LIMIT 1
);

-- Step 4: For songs without categories, assign them to UNKNOWN category
UPDATE "Song"
SET "categoryId" = (SELECT "id" FROM "Category" WHERE "name" = 'unknown')
WHERE "categoryId" IS NULL;

-- Step 5: Make categoryId NOT NULL (all songs should have a category now)
ALTER TABLE "Song" ALTER COLUMN "categoryId" SET NOT NULL;

-- Step 6: Drop foreign key constraints on SongCategory
ALTER TABLE "SongCategory" DROP CONSTRAINT "SongCategory_categoryId_fkey";
ALTER TABLE "SongCategory" DROP CONSTRAINT "SongCategory_songId_fkey";

-- Step 7: Drop the SongCategory table
DROP TABLE "SongCategory";

-- Step 8: Add foreign key constraint to Song.categoryId
ALTER TABLE "Song" ADD CONSTRAINT "Song_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
