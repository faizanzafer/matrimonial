-- CreateEnum
CREATE TYPE "LikeApproval" AS ENUM ('APPROVED', 'DECLINE');

-- AlterTable
ALTER TABLE "LikeProfile" ADD COLUMN     "status" "LikeApproval" NOT NULL DEFAULT E'DECLINE';
