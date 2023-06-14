/*
  Warnings:

  - You are about to drop the `FollowRequests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GiveAwayCommentLikes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GiveAwayCommentReplies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GiveAwayCommentRepliesLikes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GiveAwayComments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GiveAwayLikes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GiveAways` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GiveAwaysPendingPayment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FollowRequests" DROP CONSTRAINT "FollowRequests_follower_id_fkey";

-- DropForeignKey
ALTER TABLE "FollowRequests" DROP CONSTRAINT "FollowRequests_following_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayCommentLikes" DROP CONSTRAINT "GiveAwayCommentLikes_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayCommentLikes" DROP CONSTRAINT "GiveAwayCommentLikes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayCommentReplies" DROP CONSTRAINT "GiveAwayCommentReplies_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayCommentReplies" DROP CONSTRAINT "GiveAwayCommentReplies_user_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayCommentRepliesLikes" DROP CONSTRAINT "GiveAwayCommentRepliesLikes_reply_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayCommentRepliesLikes" DROP CONSTRAINT "GiveAwayCommentRepliesLikes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayComments" DROP CONSTRAINT "GiveAwayComments_give_away_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayComments" DROP CONSTRAINT "GiveAwayComments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayLikes" DROP CONSTRAINT "GiveAwayLikes_give_away_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayLikes" DROP CONSTRAINT "GiveAwayLikes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAways" DROP CONSTRAINT "GiveAways_user_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwaysPendingPayment" DROP CONSTRAINT "GiveAwaysPendingPayment_give_away_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwaysPendingPayment" DROP CONSTRAINT "GiveAwaysPendingPayment_user_id_fkey";

-- DropTable
DROP TABLE "FollowRequests";

-- DropTable
DROP TABLE "GiveAwayCommentLikes";

-- DropTable
DROP TABLE "GiveAwayCommentReplies";

-- DropTable
DROP TABLE "GiveAwayCommentRepliesLikes";

-- DropTable
DROP TABLE "GiveAwayComments";

-- DropTable
DROP TABLE "GiveAwayLikes";

-- DropTable
DROP TABLE "GiveAways";

-- DropTable
DROP TABLE "GiveAwaysPendingPayment";

-- DropEnum
DROP TYPE "FollowingApproval";

-- DropEnum
DROP TYPE "GiveAwaysStatus";

-- DropEnum
DROP TYPE "GiveAwaysType";

-- DropEnum
DROP TYPE "GiveAwaysWinnerSelectionType";
