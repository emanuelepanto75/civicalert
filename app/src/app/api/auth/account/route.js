import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jsonError } from '@/lib/http';
import { destroySession } from '@/lib/session';

// Il cittadino cancella il proprio account (conferma con la password).
// Le sue segnalazioni restano, senza dati che lo identificano, fino alla scadenza.
export async function DELETE(request) {
  const user = await getCurrentUser();
  if (!user) return jsonError('Accedi per continuare', 401);
  if (user.role !== 'CITIZEN') return jsonError('Gli account degli uffici si eliminano dalla dashboard', 403);
  const { password } = await request.json().catch(() => ({}));
  if (!password || !(await bcrypt.compare(String(password), user.passwordHash))) {
    return jsonError('Password non corretta');
  }
  await prisma.user.delete({ where: { id: user.id } });
  await destroySession();
  return NextResponse.json({ ok: true });
}
