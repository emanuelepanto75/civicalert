import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/guards';
import { publicReport } from '@/lib/reports';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  const reports = await prisma.report.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { category: true, municipality: true, deliveries: true },
  });
  return NextResponse.json({
    reports: reports.map((r) => publicReport(r, { includeOwner: true, viewerId: user.id })),
  });
}
