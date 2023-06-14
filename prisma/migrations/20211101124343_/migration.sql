/*
  Warnings:

  - You are about to drop the column `notification_id` on the `RequestPictures` table. All the data in the column will be lost.
  - Added the required column `private_req_id` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RequestPictures" DROP CONSTRAINT "RequestPictures_notification_id_fkey";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "private_req_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RequestPictures" DROP COLUMN "notification_id";

-- AddForeignKey
ALTER TABLE "Notification" ADD FOREIGN KEY ("private_req_id") REFERENCES "RequestPictures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
