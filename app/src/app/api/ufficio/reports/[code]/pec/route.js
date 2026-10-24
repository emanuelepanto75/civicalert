import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pecRecipientFor } from '@/lib/approval';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { repeatInfo } from '@/lib/deliveries';
import { baseUrl, jsonError, zodMessage } from '@/lib/http';
import { requireAdminApi } from '@/lib/office';
import { buildReportPec } from '@/lib/pec';

const include = {
  user: true,
  category: true,
  municipality: true,
  duplicateOf: { select: { id: true, code: true, createdAt: true } },
};

// Anteprima della PEC così come partirà (o è partita) verso il Comune.
export async function GET(request, { params }) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { code } = await params;
  const report = await prisma.report.findUnique({ where: { code }, include });
  if (!report) return jsonError('Segnalazione non trovata', 404);
  const pec = buildReportPec({ report, siteUrl: baseUrl(request), repeat: await repeatInfo(report) });
  return NextResponse.json({
    to: pecRecipientFor(report),
    defaultTo: report.municipality?.notifyPec ? report.municipality.pecAddress : null,
    overrideTo: config.pecOverrideTo || null,
    subject: pec.subject,
    html: pec.html,
    attachment: pec.attachments[0]?.filename || null,
    editable: report.status === 'REVIEW',
    fields: {
      recipient: report.pecRecipient || '',
      subject: report.pecSubject || '',
      note: report.pecNote || '',
      address: report.address || '',
      description: report.description || '',
    },
  });
}

const text = (max) => z.string().trim().max(max, { error: `Testo troppo lungo (max ${max} caratteri)` });
const schema = z.object({
  recipient: z.union([z.literal(''), z.email({ error: 'Indirizzo PEC del destinatario non valido' })]),
  subject: text(250),
  note: text(2000),
  address: text(300),
  description: text(1000),
});

// Modifiche dell'amministratore prima dell'approvazione. Vuoto = valore normale.
export async function PATCH(request, { params }) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const { code } = await params;
  const report = await prisma.report.findUnique({ where: { code }, select: { id: true, status: true } });
  if (!report) return jsonError('Segnalazione non trovata', 404);
  if (report.status !== 'REVIEW') return jsonError('La PEC si può modificare solo prima dell’approvazione', 409);
  const d = parsed.data;
  await prisma.report.update({
    where: { id: report.id },
    data: {
      pecRecipient: d.recipient || null,
      pecSubject: d.subject || null,
      pecNote: d.note || null,
      address: d.address || null,
      description: d.description || null,
    },
  });
  return NextResponse.json({ ok: true });
}
