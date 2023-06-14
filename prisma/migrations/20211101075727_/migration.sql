-- DropForeignKey
ALTER TABLE "LikeProfile" DROP CONSTRAINT "LikeProfile_notification_id_fkey";

-- AlterTable
ALTER TABLE "LikeProfile" ALTER COLUMN "notification_id" DROP NOT NULL;
