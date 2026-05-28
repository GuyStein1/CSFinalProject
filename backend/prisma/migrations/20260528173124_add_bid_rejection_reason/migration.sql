-- CreateEnum
CREATE TYPE "BidRejectionReason" AS ENUM ('PRICE_TOO_HIGH', 'BAD_TIMING', 'CHOSE_ANOTHER', 'NOT_QUALIFIED', 'TASK_CANCELED', 'OTHER');

-- AlterTable
ALTER TABLE "Bid" ADD COLUMN     "auto_rejected_winning_price" DOUBLE PRECISION,
ADD COLUMN     "auto_rejected_winning_rating" DOUBLE PRECISION,
ADD COLUMN     "rejection_note" TEXT,
ADD COLUMN     "rejection_reason" "BidRejectionReason";
