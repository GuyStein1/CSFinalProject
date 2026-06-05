-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "fixer_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requester_completed" BOOLEAN NOT NULL DEFAULT false;
