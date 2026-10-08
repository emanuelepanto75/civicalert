import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { jsonError, zodMessage } from '@/lib/http';
import { requireAdminApi } from '@/lib/office';

const schema = z.object({
  pecAddress: z.union([z.literal(''), z.email({ error: 'Indirizzo PEC non valido' }).max(200)]),
  notifyPec: z.boolean(),
});

/**
 * Modifica l'indirizzo PEC di un Comune e se inviargli le segnalazioni.
 * Gli invii non ancora riusciti (in attesa o non consegnati) passano al nuovo
 * indirizzo, così "Riprova" usa quello corretto.
 */
export async function PATCH(request, { params }) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const { id } = await params;
  const municipality = await prisma.municipality.findUnique({ where: { id } });
  if (!municipality) return jsonError('Comune non trovato', 404);

  const pecAddress = parsed.data.pecAddress.trim().toLowerCase() || null;
  const notifyPec = Boolean(pecAddress) && parsed.data.notifyPec;
  await prisma.municipality.update({ where: { id }, data: { pecAddress, notifyPec } });

  let moved = 0;
  if (pecAddress && pecAddress !== municipality.pecAddress) {
    ({ count: moved } = await prisma.delivery.updateMany({
      where: { status: { in: ['PENDING', 'FAILED'] }, report: { municipalityId: id } },
      data: { recipient: pecAddress },
    }));
  }
  return NextResponse.json({ ok: true, moved });
}
