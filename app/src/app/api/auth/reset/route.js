import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jsonError, zodMessage } from '@/lib/http';
import { passwordSchema } from '@/lib/validation';

export async function POST(request) {
  const { token, password } = await request.json().catch(() => ({}));
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return jsonError(zodMessage(parsed.error));

  const user = token && (await prisma.user.findUnique({ where: { resetToken: String(token) } }));
  if (!user || !user.resetTokenExp || user.resetTokenExp < new Date()) {
    return jsonError('Link scaduto o non valido. Richiedine uno nuovo.', 400);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data, 12),
      resetToken: null,
      resetTokenExp: null,
      failedLogins: 0,
      lockedUntil: null,
      // chi riceve il link ha dimostrato di possedere l'email
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}
