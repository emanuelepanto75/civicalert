import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jsonError } from '@/lib/http';
import { deleteMedia } from '@/lib/media';
import { requireAdminApi } from '@/lib/office';

// Toglie o rimette la segnalazione sulla mappa e nell'elenco pubblici (solo amministratore).
export async function PATCH(request, { params }) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { hidden } = await request.json().catch(() => ({}));
  if (typeof hidden !== 'boolean') return jsonError('Richiesta non valida');
  const { code } = await params;
  const updated = await prisma.report.updateMany({ where: { code }, data: { hiddenFromPublic: hidden } });
  if (updated.count === 0) return jsonError('Segnalazione non trovata', 404);
  return NextResponse.json({ ok: true });
}

// Elimina definitivamente una segnalazione con foto, invii e storico (solo amministratore).
// Le segnalazioni dello stesso problema collegate a questa restano, senza il collegamento.
export async function DELETE(request, { params }) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { code } = await params;
  const report = await prisma.report.findUnique({ where: { code }, select: { id: true, mediaPath: true } });
  if (!report) return jsonError('Segnalazione non trovata', 404);
  await prisma.report.delete({ where: { id: report.id } });
  if (report.mediaPath) await deleteMedia(report.mediaPath).catch(() => {});
  return NextResponse.json({ ok: true });
}
