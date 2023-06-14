/*
  Warnings:

  - Made the column `private_req_id` on table `Notification` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "private_req_id" SET NOT NULL;
