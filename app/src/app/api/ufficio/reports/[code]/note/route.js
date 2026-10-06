import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jsonError } from '@/lib/http';
import { findScopedReport, requireStaffApi } from '@/lib/office';

// Nota interna dell'ufficio: non è visibile al cittadino.
export async function POST(request, { params }) {
  const { user, error } = await requireStaffApi();
  if (error) return error;
  const { note } = await request.json().catch(() => ({}));
  const text = typeof note === 'string' ? note.trim() : '';
  if (!text) return jsonError('Scrivi il testo della nota');
  if (text.length > 2000) return jsonError('Nota troppo lunga (max 2000 caratteri)');

  const { code } = await params;
  const report = await findScopedReport(user, code);
  if (!report) return jsonError('Segnalazione non trovata', 404);
  await prisma.reportEvent.create({ data: { reportId: report.id, actorId: user.id, kind: 'NOTE', note: text } });
  return NextResponse.json({ ok: true });
}
