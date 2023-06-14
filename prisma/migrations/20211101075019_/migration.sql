/*
  Warnings:

  - Added the required column `notification_id` to the `LikeProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LikeProfile" ADD COLUMN     "notification_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "LikeProfile" ADD FOREIGN KEY ("notification_id") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
