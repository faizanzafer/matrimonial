-- CreateTable
CREATE TABLE "LikeProfile" (
    "id" TEXT NOT NULL,
    "liker_id" TEXT NOT NULL,
    "liked_id" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LikeProfile" ADD FOREIGN KEY ("liker_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikeProfile" ADD FOREIGN KEY ("liker_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
