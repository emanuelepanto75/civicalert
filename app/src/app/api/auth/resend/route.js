import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/emails';
import { baseUrl } from '@/lib/http';
import { emailSchema } from '@/lib/validation';

// Risponde sempre ok, per non rivelare quali email sono registrate.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const parsed = emailSchema.safeParse(body.email);
  if (parsed.success) {
    const user = await prisma.user.findUnique({ where: { email: parsed.data } });
    if (user && !user.emailVerifiedAt) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { verifyToken: crypto.randomBytes(32).toString('base64url') },
      });
      await sendVerificationEmail(updated, baseUrl(request)).catch((e) => console.error('[resend]', e.message));
    }
  }
  return NextResponse.json({ ok: true });
}
