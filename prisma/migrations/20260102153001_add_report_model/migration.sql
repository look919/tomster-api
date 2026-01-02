/*
  Warnings:

  - You are about to drop the column `reportAmount` on the `Song` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('WRONG_SONG_DATA', 'SONG_ISSUE', 'OTHER');

-- AlterTable
ALTER TABLE "Song" DROP COLUMN "reportAmount";

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "ReportCategory" NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT DEFAULT '',
    "songId" TEXT NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
