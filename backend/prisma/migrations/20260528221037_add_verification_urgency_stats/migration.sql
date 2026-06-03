-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaskUrgency" AS ENUM ('FLEXIBLE', 'THIS_WEEK', 'TODAY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'VERIFICATION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'VERIFICATION_REJECTED';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "completion_photos" TEXT[],
ADD COLUMN     "urgency" "TaskUrgency" NOT NULL DEFAULT 'FLEXIBLE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avg_response_time_minutes" DOUBLE PRECISION,
ADD COLUMN     "completed_tasks_as_fixer" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verification_photo_url" TEXT,
ADD COLUMN     "verification_status" "VerificationStatus" NOT NULL DEFAULT 'NONE';
