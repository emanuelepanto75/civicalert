import fs from 'node:fs/promises';
import path from 'node:path';
import { redirect } from 'next/navigation';
import { config } from './config';
import { prisma } from './db';
import { deleteMedia } from './media';
import { requireStaffPage } from './office';

const DAY = 86400000;

// Per le pagine riservate all'amministratore della piattaforma.
export async function requireAdminPage(next) {
  const user = await requireStaffPage(next);
  if (user.role !== 'ADMIN') redirect('/ufficio');
  return user;
}

/**
 * Elimina un account. Con withReports cancella anche segnalazioni e foto;
 * altrimenti le segnalazioni restano, anonime, per lo storico dei Comuni.
 */
export async function deleteUserAccount(user, { withReports = false } = {}) {
  if (withReports) {
    const reports = await prisma.report.findMany({ where: { userId: user.id }, select: { mediaPath: true } });
    await prisma.report.deleteMany({ where: { userId: user.id } });
    await Promise.all(reports.map((r) => deleteMedia(r.mediaPath).catch(() => {})));
  }
  await prisma.user.delete({ where: { id: user.id } });
}

// Lunedì della settimana di una data (ora locale del server).
function weekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

async function folderSize(dir) {
  let total = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) total += await folderSize(p);
    else total += (await fs.stat(p).catch(() => ({ size: 0 }))).size;
  }
  return total;
}

// Numeri dell'intera piattaforma per la pagina Panoramica.
export async function platformOverview({ weeks = 12 } = {}) {
  const now = Date.now();
  const since7 = new Date(now - 7 * DAY);
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
  const firstWeek = weekStart(new Date(now - (weeks - 1) * 7 * DAY));

  const [
    citizens, citizens7, reportsTotal, reports7, deliveriesFailed, deliveriesPending, pecToday,
    toVerify, recentReports, recentUsers, byMunicipality, resolved, operators, activeUsers7, dbSize, uploadBytes,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CITIZEN' } }),
    prisma.user.count({ where: { role: 'CITIZEN', createdAt: { gte: since7 } } }),
    prisma.report.count(),
    prisma.report.count({ where: { createdAt: { gte: since7 } } }),
    prisma.delivery.count({ where: { status: 'FAILED' } }),
    prisma.delivery.count({ where: { status: 'PENDING' } }),
    prisma.delivery.count({ where: { status: 'SENT', sentAt: { gte: startOfToday } } }),
    prisma.report.findMany({
      where: { NOT: { authenticity: { isEmpty: true } }, status: { in: ['PENDING', 'SENT', 'ACKNOWLEDGED'] } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { category: true, municipality: true },
    }),
    prisma.report.findMany({ where: { createdAt: { gte: firstWeek } }, select: { createdAt: true } }),
    prisma.user.findMany({ where: { role: 'CITIZEN', createdAt: { gte: firstWeek } }, select: { createdAt: true } }),
    prisma.report.groupBy({ by: ['municipalityId', 'status'], where: { municipalityId: { not: null } }, _count: { _all: true } }),
    prisma.report.findMany({
      where: { status: 'RESOLVED', resolvedAt: { not: null }, municipalityId: { not: null } },
      select: { municipalityId: true, createdAt: true, resolvedAt: true },
    }),
    prisma.user.groupBy({ by: ['municipalityId'], where: { role: 'OPERATOR', isBanned: false }, _count: { _all: true } }),
    prisma.report.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since7 }, userId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 5,
    }),
    prisma.$queryRaw`SELECT pg_database_size(current_database())::bigint AS size`,
    folderSize(config.uploadDir),
  ]);

  // Andamento settimanale
  const trend = [];
  for (let i = 0; i < weeks; i++) {
    const start = new Date(firstWeek.getTime() + i * 7 * DAY);
    trend.push({ start, reports: 0, users: 0 });
  }
  const bucket = (date) => trend[Math.floor((weekStart(date) - firstWeek) / (7 * DAY))];
  for (const r of recentReports) {
    const week = bucket(r.createdAt);
    if (week) week.reports++;
  }
  for (const u of recentUsers) {
    const week = bucket(u.createdAt);
    if (week) week.users++;
  }

  // Classifica dei Comuni
  const rows = new Map();
  for (const g of byMunicipality) {
    const row = rows.get(g.municipalityId) || { total: 0, open: 0, resolved: 0, rejected: 0, days: [] };
    row.total += g._count._all;
    if (g.status === 'RESOLVED') row.resolved += g._count._all;
    else if (g.status === 'REJECTED') row.rejected += g._count._all;
    else row.open += g._count._all;
    rows.set(g.municipalityId, row);
  }
  for (const r of resolved) rows.get(r.municipalityId)?.days.push((r.resolvedAt - r.createdAt) / DAY);
  const operatorCount = new Map(operators.map((o) => [o.municipalityId, o._count._all]));
  const municipalities = await prisma.municipality.findMany({
    where: { id: { in: [...rows.keys()] } },
    select: { id: true, name: true, provinceCode: true, pecAddress: true },
  });
  const ranking = municipalities
    .map((m) => {
      const r = rows.get(m.id);
      return {
        ...m,
        total: r.total,
        open: r.open,
        resolved: r.resolved,
        resolvedPct: r.total ? (r.resolved / r.total) * 100 : 0,
        avgDays: r.days.length ? r.days.reduce((a, b) => a + b, 0) / r.days.length : null,
        operators: operatorCount.get(m.id) || 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const topUsers = await prisma.user.findMany({
    where: { id: { in: activeUsers7.map((u) => u.userId) } },
    select: { id: true, email: true, firstName: true, lastName: true, isBanned: true },
  });
  const mostActive = activeUsers7
    .map((g) => ({ ...topUsers.find((u) => u.id === g.userId), count: g._count._all }))
    .filter((u) => u.email);

  return {
    citizens, citizens7, reportsTotal, reports7, deliveriesFailed, deliveriesPending, pecToday,
    toVerify, trend, ranking, mostActive,
    dbBytes: Number(dbSize[0]?.size || 0),
    uploadBytes,
  };
}

export function formatBytes(n) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toLocaleString('it-IT', { maximumFractionDigits: 1 })} MB`;
  return `${(n / 1024 ** 3).toLocaleString('it-IT', { maximumFractionDigits: 2 })} GB`;
}
