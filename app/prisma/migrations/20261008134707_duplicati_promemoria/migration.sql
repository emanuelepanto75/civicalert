-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "duplicate_of_id" TEXT,
ADD COLUMN     "reminder_sent_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "reports_duplicate_of_id_idx" ON "reports"("duplicate_of_id");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_duplicate_of_id_fkey" FOREIGN KEY ("duplicate_of_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
