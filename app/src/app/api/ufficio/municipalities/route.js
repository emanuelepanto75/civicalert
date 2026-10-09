import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminApi } from '@/lib/office';

// Ricerca comuni per nome (assegnazione degli operatori).
export async function GET(request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const q = (request.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ municipalities: [] });
  const municipalities = await prisma.municipality.findMany({
    where: { name: { startsWith: q, mode: 'insensitive' } },
    orderBy: { name: 'asc' },
    take: 15,
    select: { id: true, name: true, provinceCode: true, pecAddress: true },
  });
  return NextResponse.json({ municipalities });
}
