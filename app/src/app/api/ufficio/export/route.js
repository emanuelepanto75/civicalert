import { prisma } from '@/lib/db';
import { OFFICE_STATUS, buildWhere, parseFilters, requireStaffApi } from '@/lib/office';

// Esportazione CSV (separatore ";" per Excel in italiano) con gli stessi filtri del cruscotto.
function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; // evita formule eseguite da Excel
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const fmt = (d) => (d ? new Date(d).toLocaleString('it-IT', { timeZone: 'Europe/Rome' }) : '');

export async function GET(request) {
  const { user, error } = await requireStaffApi();
  if (error) return error;
  const filters = parseFilters(request.nextUrl.searchParams);
  const reports = await prisma.report.findMany({
    where: buildWhere(user, filters),
    orderBy: { createdAt: 'desc' },
    take: 10000,
    include: { category: true, municipality: true, user: true },
  });

  const header = ['Codice', 'Data', 'Categoria', 'Stato', 'Indirizzo', 'Comune', 'Latitudine', 'Longitudine', 'Descrizione', 'Segnalante', 'Email', 'Telefono', 'Chiusa il'];
  const rows = reports.map((r) => [
    r.code,
    fmt(r.createdAt),
    r.category.name,
    OFFICE_STATUS[r.status],
    r.address,
    r.municipality?.name,
    r.latitude.toFixed(6).replace('.', ','),
    r.longitude.toFixed(6).replace('.', ','),
    r.description,
    r.user ? `${r.user.firstName} ${r.user.lastName}` : 'utente rimosso',
    r.user?.email,
    r.user?.phone,
    fmt(r.resolvedAt),
  ]);
  const csv = '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="segnalazioni-${date}.csv"`,
    },
  });
}
