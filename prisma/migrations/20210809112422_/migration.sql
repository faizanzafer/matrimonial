/*
  Warnings:

  - The values [DECLINE] on the enum `LikeApproval` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LikeApproval_new" AS ENUM ('APPROVED', 'PENDING');
ALTER TABLE "LikeProfile" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "LikeProfile" ALTER COLUMN "status" TYPE "LikeApproval_new" USING ("status"::text::"LikeApproval_new");
ALTER TYPE "LikeApproval" RENAME TO "LikeApproval_old";
ALTER TYPE "LikeApproval_new" RENAME TO "LikeApproval";
DROP TYPE "LikeApproval_old";
ALTER TABLE "LikeProfile" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "LikeProfile" ALTER COLUMN "status" SET DEFAULT E'PENDING';
