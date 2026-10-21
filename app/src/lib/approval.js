import { prisma } from './db';
import { processPendingDeliveries } from './deliveries';
import { sendReviewEmail } from './emails';
import { findSameProblem } from './reports';

const include = { user: true, category: true, municipality: true, deliveries: true };

/** Destinatario della PEC: quello scelto dall'amministratore o la PEC del Comune. */
export function pecRecipientFor(report) {
  return report.pecRecipient || (report.municipality?.notifyPec ? report.municipality.pecAddress : null);
}

/** Segnalazioni in attesa di approvazione, dalla più vecchia. */
export function reportsToReview() {
  return prisma.report.findMany({
    where: { status: 'REVIEW' },
    orderBy: { createdAt: 'asc' },
    include: { ...include, duplicateOf: { select: { code: true, createdAt: true } } },
  });
}

export function countToReview() {
  return prisma.report.count({ where: { status: 'REVIEW' } });
}

/**
 * Approva una segnalazione in verifica: crea l'invio PEC al Comune (se ha una
 * PEC attiva), lo prova subito e avvisa il cittadino. Lo "stesso problema" si
 * ricalcola adesso, perché nel frattempo altre segnalazioni possono essere
 * state approvate.
 */
export async function approveReport({ report, actor, siteUrl }) {
  const sameProblem = report.duplicateOfId
    ? null
    : await findSameProblem({ ...report, userId: null, excludeId: report.id });
  const pecTo = pecRecipientFor(report);

  const updated = await prisma.report.updateMany({
    where: { id: report.id, status: 'REVIEW' },
    data: { status: 'PENDING', ...(sameProblem?.first && { duplicateOfId: sameProblem.first.id }) },
  });
  if (updated.count === 0) return { alreadyHandled: true };
  await prisma.reportEvent.create({
    data: {
      reportId: report.id,
      actorId: actor.id,
      kind: 'STATUS',
      fromStatus: 'REVIEW',
      toStatus: 'PENDING',
      note: 'Approvata dall’amministratore',
    },
  });
  if (pecTo) {
    await prisma.delivery.create({ data: { reportId: report.id, channel: 'PEC', recipient: pecTo } });
    // Come per una segnalazione nuova: si aspetta l'invio al massimo 8 secondi
    await Promise.race([
      processPendingDeliveries(siteUrl).catch((e) => console.error('[pec]', e)),
      new Promise((r) => setTimeout(r, 8000)),
    ]);
  }

  const saved = await prisma.report.findUnique({ where: { id: report.id }, include });
  const pec = saved.deliveries[0]?.status === 'SENT' ? 'SENT' : pecTo ? 'PENDING' : null;
  if (saved.user?.email) {
    await sendReviewEmail({ report: saved, approved: true, pec, siteUrl }).catch((err) =>
      console.error('[approvazione] email al cittadino non inviata:', err.message),
    );
  }
  return { pec };
}

/** Non approvata: si chiude come respinta, con il motivo inviato al cittadino. */
export async function rejectReport({ report, actor, note, siteUrl }) {
  const updated = await prisma.report.updateMany({
    where: { id: report.id, status: 'REVIEW' },
    data: { status: 'REJECTED' },
  });
  if (updated.count === 0) return { alreadyHandled: true };
  await prisma.reportEvent.create({
    data: {
      reportId: report.id,
      actorId: actor.id,
      kind: 'STATUS',
      fromStatus: 'REVIEW',
      toStatus: 'REJECTED',
      note,
      visibleToCitizen: Boolean(report.user),
    },
  });
  if (report.user?.email) {
    await sendReviewEmail({ report, approved: false, note, siteUrl }).catch((err) =>
      console.error('[approvazione] email al cittadino non inviata:', err.message),
    );
  }
  return {};
}
