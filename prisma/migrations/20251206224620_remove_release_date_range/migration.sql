/*
  Warnings:

  - You are about to drop the column `releaseDateRange` on the `Song` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Song" DROP COLUMN "releaseDateRange";

-- DropEnum
DROP TYPE "ReleaseDateRange";
