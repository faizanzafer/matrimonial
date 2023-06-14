/*
  Warnings:

  - You are about to drop the column `social_auth_provider_user_id` on the `Users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Users" DROP COLUMN "social_auth_provider_user_id",
ADD COLUMN     "social_auth_id" VARCHAR(150);
