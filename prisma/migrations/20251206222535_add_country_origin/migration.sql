/*
  Warnings:

  - You are about to drop the `GameSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlayedSong` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `duration` on table `Song` required. This step will fail if there are existing NULL values in that column.
  - Made the column `releaseYear` on table `Song` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "PlayedSong" DROP CONSTRAINT "PlayedSong_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "PlayedSong" DROP CONSTRAINT "PlayedSong_songId_fkey";

-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "countryOrigin" TEXT NOT NULL DEFAULT 'international',
ALTER COLUMN "duration" SET NOT NULL,
ALTER COLUMN "releaseYear" SET NOT NULL;

-- DropTable
DROP TABLE "GameSession";

-- DropTable
DROP TABLE "PlayedSong";
