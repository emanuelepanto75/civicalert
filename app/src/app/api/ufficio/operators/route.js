import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { jsonError, zodMessage } from '@/lib/http';
import { requireAdminApi } from '@/lib/office';
import { emailSchema, passwordSchema } from '@/lib/validation';

const schema = z.object({
  firstName: z.string().trim().min(1, { error: 'Inserisci il nome' }).max(80),
  lastName: z.string().trim().min(1, { error: 'Inserisci il cognome' }).max(80),
  email: emailSchema,
  password: passwordSchema,
  municipalityId: z.string().uuid({ error: 'Scegli il Comune' }),
});

// Crea un account operatore per un Comune (solo amministratori).
export async function POST(request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const { password, ...data } = parsed.data;

  if (!(await prisma.municipality.findUnique({ where: { id: data.municipalityId } }))) return jsonError('Comune non trovato');
  if (await prisma.user.findUnique({ where: { email: data.email } })) {
    return jsonError('Esiste già un account con questa email', 409);
  }
  await prisma.user.create({
    data: {
      ...data,
      phone: '',
      role: 'OPERATOR',
      passwordHash: await bcrypt.hash(password, 12),
      privacyAcceptedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
