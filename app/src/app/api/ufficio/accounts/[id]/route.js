import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { deleteUserAccount } from '@/lib/admin';
import { prisma } from '@/lib/db';
import { jsonError, zodMessage } from '@/lib/http';
import { requireAdminApi } from '@/lib/office';
import { passwordSchema } from '@/lib/validation';

// Cittadini e operatori comunali; gli amministratori non si gestiscono da qui.
async function findManaged(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  return user && user.role !== 'ADMIN' ? user : null;
}

// { active: true|false } blocca o riattiva l'accesso; { password } la reimposta.
export async function PATCH(request, { params }) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const user = await findManaged((await params).id);
  if (!user) return jsonError('Account non trovato', 404);
  const body = await request.json().catch(() => ({}));

  if (typeof body.active === 'boolean') {
    await prisma.user.update({ where: { id: user.id }, data: { isBanned: !body.active } });
    return NextResponse.json({ ok: true });
  }
  if (body.password !== undefined) {
    const parsed = passwordSchema.safeParse(body.password);
    if (!parsed.success) return jsonError(zodMessage(parsed.error));
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(parsed.data, 12), failedLogins: 0, lockedUntil: null },
    });
    return NextResponse.json({ ok: true });
  }
  return jsonError('Nessuna modifica richiesta');
}

// ?segnalazioni=1 elimina anche segnalazioni e foto; altrimenti restano anonime.
export async function DELETE(request, { params }) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const user = await findManaged((await params).id);
  if (!user) return jsonError('Account non trovato', 404);
  const withReports = new URL(request.url).searchParams.get('segnalazioni') === '1';
  await deleteUserAccount(user, { withReports });
  return NextResponse.json({ ok: true });
}
