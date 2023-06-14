/*
  Warnings:

  - You are about to drop the column `notification_id` on the `LikeProfile` table. All the data in the column will be lost.
  - Added the required column `request_id` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "LikeProfile" DROP CONSTRAINT "LikeProfile_notification_id_fkey";

-- AlterTable
ALTER TABLE "LikeProfile" DROP COLUMN "notification_id";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "request_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Notification" ADD FOREIGN KEY ("request_id") REFERENCES "LikeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
