/*
  Warnings:

  - Made the column `notification_id` on table `LikeProfile` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "LikeProfile" ALTER COLUMN "notification_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "LikeProfile" ADD FOREIGN KEY ("notification_id") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
