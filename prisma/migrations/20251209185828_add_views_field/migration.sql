/*
  Warnings:

  - You are about to drop the column `artists` on the `Song` table. All the data in the column will be lost.
  - You are about to drop the column `importSource` on the `Song` table. All the data in the column will be lost.
  - Added the required column `artist` to the `Song` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Song" DROP COLUMN "artists",
DROP COLUMN "importSource",
ADD COLUMN     "artist" TEXT NOT NULL,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;
