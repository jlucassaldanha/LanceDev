/*
  Warnings:

  - Added the required column `artDate` to the `Lot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `artistDisplayName` to the `Lot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lot" ADD COLUMN     "artDate" TEXT NOT NULL,
ADD COLUMN     "artistDisplayName" TEXT NOT NULL;
