/*
  Warnings:

  - You are about to drop the column `picture_url` on the `Users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Users" DROP COLUMN "picture_url",
ADD COLUMN     "profile_picture_url" TEXT;
