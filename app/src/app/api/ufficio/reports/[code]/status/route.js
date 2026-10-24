import { NextResponse } from 'next/server';
import { z } from 'zod';
import { baseUrl, jsonError, zodMessage } from '@/lib/http';
import { SETTABLE_STATUSES, changeStatus, findScopedReport, requireStaffApi } from '@/lib/office';

const schema = z
  .object({
    status: z.enum(SETTABLE_STATUSES, { error: 'Stato non valido' }),
    note: z.string().trim().max(2000, { error: 'Nota troppo lunga (max 2000 caratteri)' }).optional(),
    notify: z.boolean().optional(),
  })
  .refine((d) => d.status !== 'REJECTED' || d.note, { error: 'Indica il motivo per cui la segnalazione viene respinta' });

export async function POST(request, { params }) {
  const { user, error } = await requireStaffApi();
  if (error) return error;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));

  const { code } = await params;
  const report = await findScopedReport(user, code);
  if (!report) return jsonError('Segnalazione non trovata', 404);
  if (report.status === parsed.data.status) return jsonError('La segnalazione è già in questo stato');

  await changeStatus({ report, actor: user, toStatus: parsed.data.status, note: parsed.data.note, notify: parsed.data.notify !== false, siteUrl: baseUrl(request) });
  return NextResponse.json({ ok: true });
}
