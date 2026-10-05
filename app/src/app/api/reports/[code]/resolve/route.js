import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/guards';
import { jsonError } from '@/lib/http';

// Il cittadino conferma che il problema è stato risolto: la segnalazione si chiude.
export async function POST(request, { params }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { code } = await params;
  const report = await prisma.report.findUnique({ where: { code } });
  if (!report || report.userId !== user.id) return jsonError('Segnalazione non trovata', 404);
  if (report.status === 'RESOLVED' || report.status === 'REJECTED') return jsonError('La segnalazione è già chiusa');

  await prisma.report.update({
    where: { id: report.id },
    data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedBy: 'CITIZEN' },
  });
  return NextResponse.json({ ok: true });
}
