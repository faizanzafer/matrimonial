/*
  Warnings:

  - You are about to drop the column `profile_url` on the `Users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Users" DROP COLUMN "profile_url",
ADD COLUMN     "picture_url" TEXT;
