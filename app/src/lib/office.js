import { redirect } from 'next/navigation';
import { getCurrentUser, isStaff } from './auth';
import { prisma } from './db';
import { sendStatusEmail } from './emails';
import { jsonError } from './http';

// Etichette degli stati dal punto di vista dell'ufficio comunale.
export const OFFICE_STATUS = {
  PENDING: 'Ricevuta (PEC non inviata)',
  SENT: 'Nuova',
  ACKNOWLEDGED: 'In lavorazione',
  RESOLVED: 'Risolta',
  REJECTED: 'Respinta',
};

// Stati che l'operatore può impostare.
export const SETTABLE_STATUSES = ['ACKNOWLEDGED', 'RESOLVED', 'REJECTED'];

export const STATUS_FILTERS = {
  aperte: { label: 'Aperte', statuses: ['PENDING', 'SENT', 'ACKNOWLEDGED'] },
  nuove: { label: 'Da prendere in carico', statuses: ['PENDING', 'SENT'] },
  lavorazione: { label: 'In lavorazione', statuses: ['ACKNOWLEDGED'] },
  risolte: { label: 'Risolte', statuses: ['RESOLVED'] },
  respinte: { label: 'Respinte', statuses: ['REJECTED'] },
  tutte: { label: 'Tutte', statuses: null },
};

// Per le pagine /ufficio: reindirizza chi non è operatore o amministratore.
export async function requireStaffPage(next = '/ufficio') {
  const user = await getCurrentUser();
  if (!user) redirect(`/accedi?next=${encodeURIComponent(next)}`);
  if (!isStaff(user)) redirect('/');
  return user;
}

export async function requireStaffApi() {
  const user = await getCurrentUser();
  if (!user) return { error: jsonError('Accedi per continuare', 401) };
  if (!isStaff(user)) return { error: jsonError('Accesso riservato agli uffici comunali', 403) };
  return { user };
}

export async function requireAdminApi() {
  const result = await requireStaffApi();
  if (result.error) return result;
  if (result.user.role !== 'ADMIN') return { error: jsonError('Accesso riservato agli amministratori', 403) };
  return result;
}

const toDate = (value, endOfDay = false) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
};

export function parseFilters(params) {
  const get = (k) => (typeof params?.get === 'function' ? params.get(k) : params?.[k]) || '';
  const stato = STATUS_FILTERS[get('stato')] ? get('stato') : 'aperte';
  return {
    stato,
    categoria: get('categoria'),
    q: get('q').trim().slice(0, 100),
    dal: get('dal'),
    al: get('al'),
    comune: get('comune'),
    utente: get('utente'),
  };
}

// Un operatore vede solo il proprio Comune; l'amministratore tutti (o quello scelto).
export function scopeWhere(user, filters = {}) {
  if (user.role === 'ADMIN') {
    return {
      ...(filters.comune && { municipalityId: filters.comune }),
      ...(filters.utente && { userId: filters.utente }),
    };
  }
  return { municipalityId: user.municipalityId };
}

export function buildWhere(user, filters) {
  const where = { ...scopeWhere(user, filters) };
  const statuses = STATUS_FILTERS[filters.stato].statuses;
  if (statuses) where.status = { in: statuses };
  if (filters.categoria) where.categoryId = filters.categoria;
  const from = toDate(filters.dal);
  const to = toDate(filters.al, true);
  if (from || to) where.createdAt = { ...(from && { gte: from }), ...(to && { lte: to }) };
  if (filters.q) {
    where.OR = [
      { code: { contains: filters.q, mode: 'insensitive' } },
      { address: { contains: filters.q, mode: 'insensitive' } },
      { description: { contains: filters.q, mode: 'insensitive' } },
    ];
  }
  return where;
}

export async function findScopedReport(user, code) {
  const report = await prisma.report.findUnique({
    where: { code },
    include: {
      category: true,
      municipality: true,
      user: true,
      deliveries: true,
      duplicateOf: { select: { code: true, createdAt: true } },
      duplicates: { select: { code: true, createdAt: true, status: true }, orderBy: { createdAt: 'asc' } },
    },
  });
  if (!report) return null;
  if (user.role !== 'ADMIN' && report.municipalityId !== user.municipalityId) return null;
  return report;
}

async function applyStatus({ report, actor, toStatus, note, notify, siteUrl }) {
  const resolved = toStatus === 'RESOLVED';
  await prisma.$transaction([
    prisma.report.update({
      where: { id: report.id },
      data: {
        status: toStatus,
        resolvedAt: resolved ? new Date() : null,
        resolvedBy: resolved ? 'MUNICIPALITY' : null,
      },
    }),
    prisma.reportEvent.create({
      data: {
        reportId: report.id,
        actorId: actor.id,
        kind: 'STATUS',
        fromStatus: report.status,
        toStatus,
        note: note || null,
        visibleToCitizen: Boolean(notify),
      },
    }),
  ]);
  if (notify && report.user?.email) {
    await sendStatusEmail({ report, toStatus, note, siteUrl }).catch((err) =>
      console.error('[ufficio] email al cittadino non inviata:', err.message),
    );
  }
}

/**
 * Cambia lo stato di una segnalazione, registra l'evento nello storico e,
 * se richiesto, avvisa il cittadino via email. Se altri cittadini hanno
 * segnalato lo stesso problema, le loro segnalazioni ancora aperte seguono la
 * prima e anche loro vengono avvisati.
 */
export async function changeStatus({ report, actor, toStatus, note, notify, siteUrl }) {
  await applyStatus({ report, actor, toStatus, note, notify, siteUrl });
  if (report.duplicateOfId) return;
  const others = await prisma.report.findMany({
    where: { duplicateOfId: report.id, status: { in: ['PENDING', 'SENT', 'ACKNOWLEDGED'], not: toStatus } },
    include: { user: true, category: true },
  });
  for (const other of others) {
    await applyStatus({ report: other, actor, toStatus, note, notify, siteUrl });
  }
}

// Indicatori per il cruscotto.
export async function dashboardStats(user, filters) {
  const scope = scopeWhere(user, filters);
  const since30 = new Date(Date.now() - 30 * 86400000);
  const since90 = new Date(Date.now() - 90 * 86400000);
  const [nuove, lavorazione, risolte30, resolvedRecent, perCategory, categories] = await Promise.all([
    prisma.report.count({ where: { ...scope, status: { in: ['PENDING', 'SENT'] } } }),
    prisma.report.count({ where: { ...scope, status: 'ACKNOWLEDGED' } }),
    prisma.report.count({ where: { ...scope, status: 'RESOLVED', resolvedAt: { gte: since30 } } }),
    prisma.report.findMany({
      where: { ...scope, status: 'RESOLVED', resolvedAt: { gte: since90 } },
      select: { createdAt: true, resolvedAt: true },
    }),
    prisma.report.groupBy({
      by: ['categoryId'],
      where: { ...scope, status: { in: ['PENDING', 'SENT', 'ACKNOWLEDGED'] } },
      _count: { _all: true },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);
  const avgDays = resolvedRecent.length
    ? resolvedRecent.reduce((sum, r) => sum + (r.resolvedAt - r.createdAt), 0) / resolvedRecent.length / 86400000
    : null;
  const counts = new Map(perCategory.map((g) => [g.categoryId, g._count._all]));
  return {
    nuove,
    lavorazione,
    risolte30,
    avgDays,
    byCategory: categories
      .map((c) => ({ id: c.id, name: c.name, icon: c.icon, count: counts.get(c.id) || 0 }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count),
    categories,
  };
}
