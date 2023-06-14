-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "firstname" VARCHAR(150) NOT NULL,
    "lastname" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password" VARCHAR(150) NOT NULL,
    "picture_url" TEXT,

    PRIMARY KEY ("id")
);
