import { prisma } from './db';
import { sendReportPec } from './pec';

const MAX_ATTEMPTS = 3;
const RETRY_MINUTES = [1, 5, 30]; // attesa dopo il 1°, 2°, 3° fallimento
let running = false;
let lastSiteUrl = ''; // per i link nelle PEC inviate dal worker periodico

async function attempt(delivery, siteUrl) {
  const report = await prisma.report.findUnique({
    where: { id: delivery.reportId },
    include: { user: true, category: true, municipality: true, duplicateOf: { select: { id: true, code: true, createdAt: true } } },
  });
  const attempts = delivery.attempts + 1;
  try {
    // Stesso problema già segnalato da altri: quante volte, compresa questa
    const repeat = report.duplicateOf && {
      firstCode: report.duplicateOf.code,
      firstDate: report.duplicateOf.createdAt,
      number: await prisma.report.count({
        where: {
          OR: [{ id: report.duplicateOf.id }, { duplicateOfId: report.duplicateOf.id }],
          createdAt: { lte: report.createdAt },
        },
      }),
    };
    const messageId = await sendReportPec({ report, recipient: delivery.recipient, siteUrl, repeat });
    await prisma.$transaction([
      prisma.delivery.update({
        where: { id: delivery.id },
        data: { status: 'SENT', attempts, messageId, sentAt: new Date(), lastError: null },
      }),
      prisma.report.updateMany({ where: { id: report.id, status: 'PENDING' }, data: { status: 'SENT' } }),
    ]);
  } catch (err) {
    console.error(`[pec] invio ${report.code} fallito (tentativo ${attempts}):`, err.message);
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        attempts,
        lastError: err.message.slice(0, 500),
        status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
        nextAttemptAt: new Date(Date.now() + RETRY_MINUTES[attempts - 1] * 60_000),
      },
    });
  }
}

// Indirizzo del sito visto nell'ultima richiesta: serve ai lavori in background.
export function knownSiteUrl() {
  return lastSiteUrl;
}

// Processa gli invii in attesa. Chiamata subito dopo una nuova segnalazione e,
// periodicamente, dal worker avviato in instrumentation.js (anche dopo un riavvio).
export async function processPendingDeliveries(siteUrl) {
  if (siteUrl) lastSiteUrl = siteUrl;
  if (running) return;
  running = true;
  try {
    const due = await prisma.delivery.findMany({
      where: { status: 'PENDING', nextAttemptAt: { lte: new Date() } },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    for (const delivery of due) await attempt(delivery, lastSiteUrl);
  } finally {
    running = false;
  }
}
