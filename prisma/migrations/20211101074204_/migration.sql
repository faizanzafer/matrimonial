/*
  Warnings:

  - You are about to drop the column `notification_id` on the `LikeProfile` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "LikeProfile" DROP CONSTRAINT "LikeProfile_notification_id_fkey";

-- AlterTable
ALTER TABLE "LikeProfile" DROP COLUMN "notification_id";
