import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { publicUser } from '@/lib/auth';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { jsonError, zodMessage } from '@/lib/http';
import { createSession } from '@/lib/session';
import { loginSchema } from '@/lib/validation';

const INVALID = 'Email o password non corretti';

export async function POST(request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await bcrypt.hash(password, 12); // tempi di risposta uguali con email inesistente
    return jsonError(INVALID, 401);
  }
  if (user.isBanned) return jsonError('Account sospeso. Contatta l’amministratore.', 403);
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    return jsonError(`Troppi tentativi falliti. Riprova tra ${minutes} minuti.`, 429);
  }

  if (!(await bcrypt.compare(password, user.passwordHash))) {
    const failed = user.failedLogins + 1;
    const lock = failed >= config.maxLoginAttempts;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: lock ? 0 : failed,
        lockedUntil: lock ? new Date(Date.now() + config.loginLockMinutes * 60000) : null,
      },
    });
    return jsonError(INVALID, 401);
  }

  if (!user.emailVerifiedAt) {
    return jsonError('Conferma prima il tuo indirizzo email (controlla la posta).', 403, { needsVerification: true });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await createSession(user);
  return NextResponse.json({ user: publicUser(user) });
}
