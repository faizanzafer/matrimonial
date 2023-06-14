/*
  Warnings:

  - The `age` column on the `Users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `height` column on the `Users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Users" DROP COLUMN "age",
ADD COLUMN     "age" DOUBLE PRECISION,
DROP COLUMN "height",
ADD COLUMN     "height" DOUBLE PRECISION;
