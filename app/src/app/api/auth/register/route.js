import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/emails';
import { baseUrl, jsonError, zodMessage } from '@/lib/http';
import { createSession } from '@/lib/session';
import { registerSchema } from '@/lib/validation';

export async function POST(request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const { password, privacy, ...data } = parsed.data;

  if (await prisma.user.findUnique({ where: { email: data.email } })) {
    return jsonError('Esiste già un account con questa email', 409);
  }

  const user = await prisma.user.create({
    data: {
      ...data,
      passwordHash: await bcrypt.hash(password, 12),
      privacyAcceptedAt: new Date(),
      verifyToken: crypto.randomBytes(32).toString('base64url'),
      emailVerifiedAt: config.requireEmailVerification ? null : new Date(),
    },
  });

  if (!config.requireEmailVerification) {
    await createSession(user);
    return NextResponse.json({ ok: true, verified: true });
  }
  try {
    await sendVerificationEmail(user, baseUrl(request));
  } catch (err) {
    console.error('[register] email di verifica non inviata:', err.message);
  }
  return NextResponse.json({ ok: true, verified: false });
}
