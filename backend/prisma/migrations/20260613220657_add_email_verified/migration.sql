-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false;

-- Mark all existing users as verified (they registered before email verification was required)
UPDATE "User" SET "email_verified" = true;
