-- CreateTable
CREATE TABLE "ZodiacSign" (
    "id" TEXT NOT NULL,
    "sign_name" VARCHAR(150),
    "sign_picture" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);
