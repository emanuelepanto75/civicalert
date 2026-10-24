import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { baseUrl } from '@/lib/http';

// Link contenuto nell'email di conferma.
export async function GET(request) {
  const token = request.nextUrl.searchParams.get('token');
  const user = token && (await prisma.user.findUnique({ where: { verifyToken: token } }));
  const site = baseUrl(request);
  if (!user) return NextResponse.redirect(`${site}/accedi?verifica=errore`);
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date(), verifyToken: null },
  });
  return NextResponse.redirect(`${site}/accedi?verifica=ok`);
}
