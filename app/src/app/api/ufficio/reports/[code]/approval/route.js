import { NextResponse } from 'next/server';
import { z } from 'zod';
import { approveReport, rejectReport } from '@/lib/approval';
import { prisma } from '@/lib/db';
import { baseUrl, jsonError, zodMessage } from '@/lib/http';
import { requireAdminApi } from '@/lib/office';

const schema = z
  .object({
    action: z.enum(['approve', 'reject'], { error: 'Azione non valida' }),
    note: z.string().trim().max(2000, { error: 'Motivo troppo lungo (max 2000 caratteri)' }).optional(),
  })
  .refine((d) => d.action !== 'reject' || d.note, { error: 'Indica il motivo: verrà inviato al cittadino' });

// Approvazione dell'amministratore prima dell'invio al Comune.
export async function POST(request, { params }) {
  const { user, error } = await requireAdminApi();
  if (error) return error;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));

  const { code } = await params;
  const report = await prisma.report.findUnique({
    where: { code },
    include: { user: true, category: true, municipality: true },
  });
  if (!report) return jsonError('Segnalazione non trovata', 404);
  if (report.status !== 'REVIEW') return jsonError('La segnalazione non è più in attesa di approvazione', 409);

  const siteUrl = baseUrl(request);
  const result =
    parsed.data.action === 'approve'
      ? await approveReport({ report, actor: user, siteUrl })
      : await rejectReport({ report, actor: user, note: parsed.data.note, siteUrl });
  if (result.alreadyHandled) return jsonError('La segnalazione è già stata gestita', 409);
  return NextResponse.json({ ok: true, pec: result.pec ?? null });
}
