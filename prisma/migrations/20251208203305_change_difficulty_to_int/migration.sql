/*
  Warnings:

  - The `difficulty` column on the `Song` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "importSource" TEXT,
ADD COLUMN     "importedAt" TIMESTAMP(3),
DROP COLUMN "difficulty",
ADD COLUMN     "difficulty" INTEGER NOT NULL DEFAULT 5;

-- DropEnum
DROP TYPE "Difficulty";
