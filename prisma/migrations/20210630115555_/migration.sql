-- CreateEnum
CREATE TYPE "GiveAwaysType" AS ENUM ('CASH', 'AIRTIME');

-- CreateEnum
CREATE TYPE "GiveAwaysStatus" AS ENUM ('ACTIVE', 'PAYMENTPENDING', 'ENDED');

-- CreateEnum
CREATE TYPE "GiveAwaysWinnerSelectionType" AS ENUM ('AUTOMATIC', 'MANUALLY');

-- CreateEnum
CREATE TYPE "FollowingApproval" AS ENUM ('PENDING', 'APPROVED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'MEDIA');

-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,
    "user_name" VARCHAR(150),
    "firstname" VARCHAR(150),
    "lastname" VARCHAR(150),
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(150),
    "gender" VARCHAR(150),
    "age" VARCHAR(150),
    "ziodic_sign" VARCHAR(150),
    "education" VARCHAR(150),
    "city" VARCHAR(150),
    "country" VARCHAR(150),
    "height" VARCHAR(150),
    "status" VARCHAR(150),
    "body_type" VARCHAR(150),
    "profession" VARCHAR(150),
    "profile_url" TEXT,
    "password" VARCHAR(150),
    "social_auth_provider_user_id" VARCHAR(150),
    "is_registered" BOOLEAN DEFAULT false,
    "show_profile_picture" BOOLEAN,
    "show_private_picture" BOOLEAN,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "login_attempts" INTEGER DEFAULT 0,
    "locked_at" TIMESTAMP(3),

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGallery" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "picture_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpVerify" (
    "id" TEXT NOT NULL,
    "user_identifier" VARCHAR(150) NOT NULL,
    "otp" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResetPassword" (
    "id" TEXT NOT NULL,
    "user_identifier" VARCHAR(150) NOT NULL,
    "otp" INTEGER NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowRequests" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "status" "FollowingApproval" NOT NULL DEFAULT E'PENDING',

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiveAways" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "GiveAwaysType" NOT NULL DEFAULT E'CASH',
    "amount_per_person" DOUBLE PRECISION NOT NULL,
    "total_winners" INTEGER NOT NULL,
    "total_cost" DOUBLE PRECISION NOT NULL,
    "winner_selection_type" "GiveAwaysWinnerSelectionType" NOT NULL DEFAULT E'AUTOMATIC',
    "status" "GiveAwaysStatus" NOT NULL DEFAULT E'PAYMENTPENDING',
    "start_date_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date_time" TIMESTAMP(3) NOT NULL,
    "complete_end_date_time" TEXT,
    "about" TEXT NOT NULL,
    "payment_confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiveAwayLikes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "give_away_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiveAwayComments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "give_away_id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiveAwayCommentLikes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiveAwayCommentReplies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "reply" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiveAwayCommentRepliesLikes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reply_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiveAwaysPendingPayment" (
    "id" TEXT NOT NULL,
    "flw_ref" VARCHAR(150) NOT NULL,
    "user_id" TEXT NOT NULL,
    "give_away_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserChannel" (
    "id" TEXT NOT NULL,
    "from_id" TEXT NOT NULL,
    "to_id" TEXT NOT NULL,
    "delete_conversation_for_from_id" BOOLEAN DEFAULT false,
    "delete_conversation_for_to_id" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelMessages" (
    "id" TEXT NOT NULL,
    "from_id" TEXT NOT NULL,
    "to_id" TEXT NOT NULL,
    "users_channels_id" TEXT NOT NULL,
    "message_body" TEXT NOT NULL DEFAULT E'',
    "seen" BOOLEAN DEFAULT false,
    "message_type" "MessageType" NOT NULL DEFAULT E'TEXT',
    "attachments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_give_away_like" ON "GiveAwayLikes"("user_id", "give_away_id");

-- AddForeignKey
ALTER TABLE "UserGallery" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowRequests" ADD FOREIGN KEY ("follower_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowRequests" ADD FOREIGN KEY ("following_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAways" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayLikes" ADD FOREIGN KEY ("give_away_id") REFERENCES "GiveAways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayLikes" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayComments" ADD FOREIGN KEY ("give_away_id") REFERENCES "GiveAways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayComments" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayCommentLikes" ADD FOREIGN KEY ("comment_id") REFERENCES "GiveAwayComments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayCommentLikes" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayCommentReplies" ADD FOREIGN KEY ("comment_id") REFERENCES "GiveAwayComments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayCommentReplies" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayCommentRepliesLikes" ADD FOREIGN KEY ("reply_id") REFERENCES "GiveAwayCommentReplies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayCommentRepliesLikes" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwaysPendingPayment" ADD FOREIGN KEY ("give_away_id") REFERENCES "GiveAways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwaysPendingPayment" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChannel" ADD FOREIGN KEY ("from_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChannel" ADD FOREIGN KEY ("to_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessages" ADD FOREIGN KEY ("from_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessages" ADD FOREIGN KEY ("to_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessages" ADD FOREIGN KEY ("users_channels_id") REFERENCES "UserChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
