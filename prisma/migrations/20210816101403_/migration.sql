/*
  Warnings:

  - You are about to drop the column `seen` on the `ChannelMessages` table. All the data in the column will be lost.
  - You are about to drop the column `delete_conversation_for_from_id` on the `UserChannel` table. All the data in the column will be lost.
  - You are about to drop the column `delete_conversation_for_to_id` on the `UserChannel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChannelMessages" DROP COLUMN "seen";

-- AlterTable
ALTER TABLE "UserChannel" DROP COLUMN "delete_conversation_for_from_id",
DROP COLUMN "delete_conversation_for_to_id";
