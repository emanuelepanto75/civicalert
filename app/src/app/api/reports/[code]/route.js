import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jsonError } from '@/lib/http';
import { publicReport } from '@/lib/reports';

export async function GET(request, { params }) {
  const { code } = await params;
  const report = await prisma.report.findUnique({
    where: { code },
    include: { category: true, municipality: true, deliveries: true },
  });
  if (!report) return jsonError('Segnalazione non trovata', 404);
  const user = await getCurrentUser();
  const isOwner = user && report.userId === user.id;
  return NextResponse.json({ report: publicReport(report, { includeOwner: isOwner, viewerId: user?.id }) });
}
