import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { jsonError, zodMessage } from '@/lib/http';
import { findScopedReport, requireStaffApi } from '@/lib/office';

const schema = z.object({
  number: z.string().trim().max(40, { error: 'Numero di protocollo troppo lungo' }),
  date: z.string().trim().max(20, { error: 'Data troppo lunga' }).optional(),
});

// Numero di protocollo del Comune, inserito o corretto a mano (amministratore o operatore del Comune).
export async function PATCH(request, { params }) {
  const { user, error } = await requireStaffApi();
  if (error) return error;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const { code } = await params;
  const report = await findScopedReport(user, code);
  if (!report) return jsonError('Segnalazione non trovata', 404);
  await prisma.report.update({
    where: { id: report.id },
    data: { protocolNumber: parsed.data.number || null, protocolDate: parsed.data.number ? parsed.data.date || null : null },
  });
  return NextResponse.json({ ok: true });
}
