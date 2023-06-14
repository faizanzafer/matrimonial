-- CreateEnum
CREATE TYPE "LogInApproval" AS ENUM ('APPROVED', 'PENDING');

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "admin_approval" "LogInApproval" NOT NULL DEFAULT E'PENDING';
