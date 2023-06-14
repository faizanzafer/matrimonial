-- CreateTable
CREATE TABLE "RequestPictures" (
    "id" TEXT NOT NULL,
    "first_user_id" TEXT NOT NULL,
    "second_user_id" TEXT NOT NULL,
    "permissions" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RequestPictures" ADD FOREIGN KEY ("first_user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestPictures" ADD FOREIGN KEY ("second_user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
