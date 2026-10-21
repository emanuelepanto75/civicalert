-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "delivered_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "protocol_date" TEXT,
ADD COLUMN     "protocol_number" TEXT;

-- CreateTable
CREATE TABLE "inbound_messages" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "report_id" TEXT,
    "from_address" TEXT,
    "subject" TEXT,
    "text" TEXT,
    "protocol_number" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inbound_messages_message_id_key" ON "inbound_messages"("message_id");

-- CreateIndex
CREATE INDEX "inbound_messages_report_id_received_at_idx" ON "inbound_messages"("report_id", "received_at");

-- AddForeignKey
ALTER TABLE "inbound_messages" ADD CONSTRAINT "inbound_messages_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
