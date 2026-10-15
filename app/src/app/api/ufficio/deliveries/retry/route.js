import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processPendingDeliveries } from '@/lib/deliveries';
import { baseUrl, jsonError } from '@/lib/http';
import { requireAdminApi } from '@/lib/office';

// Rimette in coda un invio PEC ({ id }) o tutti quelli non consegnati ({ all: true })
// e prova subito a spedirli.
export async function POST(request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id, all } = await request.json().catch(() => ({}));
  if (!id && !all) return jsonError('Indica quale invio riprovare');

  const where = all ? { status: 'FAILED' } : { id: String(id), status: { not: 'SENT' } };
  const { count } = await prisma.delivery.updateMany({
    where,
    data: { status: 'PENDING', attempts: 0, nextAttemptAt: new Date(), lastError: null },
  });
  if (!count) return jsonError('Nessun invio da riprovare', 404);
  await processPendingDeliveries(baseUrl(request));
  return NextResponse.json({ ok: true, count });
}
