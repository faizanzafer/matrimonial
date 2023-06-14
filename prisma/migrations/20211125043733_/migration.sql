-- CreateTable
CREATE TABLE "ChatBlock" (
    "id" TEXT NOT NULL,
    "blocker_id" TEXT NOT NULL,
    "blocked_id" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChatBlock" ADD FOREIGN KEY ("blocker_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatBlock" ADD FOREIGN KEY ("blocked_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
