import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jsonError } from '@/lib/http';
import { requireAdminApi } from '@/lib/office';

// Attiva o disattiva l'accesso di un operatore.
export async function PATCH(request, { params }) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const { active } = await request.json().catch(() => ({}));
  const operator = await prisma.user.findUnique({ where: { id } });
  if (!operator || operator.role !== 'OPERATOR') return jsonError('Operatore non trovato', 404);
  await prisma.user.update({ where: { id }, data: { isBanned: !active } });
  return NextResponse.json({ ok: true });
}
