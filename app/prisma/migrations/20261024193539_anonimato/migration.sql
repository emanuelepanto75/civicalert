-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "anonymous" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "anonymous_default" BOOLEAN NOT NULL DEFAULT false;
