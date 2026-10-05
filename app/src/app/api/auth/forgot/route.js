import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendResetEmail } from '@/lib/emails';
import { baseUrl } from '@/lib/http';
import { emailSchema } from '@/lib/validation';

// Risponde sempre ok, per non rivelare quali email sono registrate.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const parsed = emailSchema.safeParse(body.email);
  if (parsed.success) {
    const user = await prisma.user.findUnique({ where: { email: parsed.data } });
    if (user && !user.isBanned) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: crypto.randomBytes(32).toString('base64url'),
          resetTokenExp: new Date(Date.now() + 3600 * 1000),
        },
      });
      await sendResetEmail(updated, baseUrl(request)).catch((e) => console.error('[forgot]', e.message));
    }
  }
  return NextResponse.json({ ok: true });
}
