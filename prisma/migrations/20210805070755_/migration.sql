/*
  Warnings:

  - Added the required column `interest` to the `LikeProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LikeProfile" ADD COLUMN     "interest" TEXT NOT NULL;
