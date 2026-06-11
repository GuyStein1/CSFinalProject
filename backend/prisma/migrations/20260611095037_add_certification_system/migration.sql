/*
  Warnings:

  - A unique constraint covering the columns `[fixer_id,category]` on the table `Certification` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `category` to the `Certification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Certification` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CERTIFICATION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'CERTIFICATION_REJECTED';

-- AlterTable
ALTER TABLE "Certification" ADD COLUMN     "category" "Category" NOT NULL,
ADD COLUMN     "rejection_note" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" TEXT,
ADD COLUMN     "status" "CertificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Certification_status_idx" ON "Certification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Certification_fixer_id_category_key" ON "Certification"("fixer_id", "category");

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
