-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('STATUS', 'NOTE');

-- CreateTable
CREATE TABLE "report_events" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "kind" "EventKind" NOT NULL,
    "from_status" "ReportStatus",
    "to_status" "ReportStatus",
    "note" TEXT,
    "visible_to_citizen" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_events_report_id_created_at_idx" ON "report_events"("report_id", "created_at");

-- CreateIndex
CREATE INDEX "reports_municipality_id_status_idx" ON "reports"("municipality_id", "status");

-- AddForeignKey
ALTER TABLE "report_events" ADD CONSTRAINT "report_events_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_events" ADD CONSTRAINT "report_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
