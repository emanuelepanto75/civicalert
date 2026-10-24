import { config } from './config';
import { prisma } from './db';
import { knownSiteUrl } from './deliveries';
import { sendReminderEmail } from './emails';

let running = false;

/**
 * Comuni senza cruscotto: dopo REMINDER_DAYS giorni chiede al cittadino se il
 * problema è stato risolto, una sola volta per segnalazione. Il cittadino lo
 * conferma dall'app con "Segna come risolta".
 */
export async function processReminders() {
  const siteUrl = config.publicUrl.replace(/\/$/, '') || knownSiteUrl();
  if (running || !siteUrl) return;
  running = true;
  try {
    const due = await prisma.report.findMany({
      where: {
        status: 'SENT',
        reminderSentAt: null,
        userId: { not: null },
        createdAt: { lte: new Date(Date.now() - config.reminderDays * 86400000) },
        municipality: { operators: { none: { role: 'OPERATOR', isBanned: false } } },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: { user: true, category: true },
    });
    for (const report of due) {
      try {
        await sendReminderEmail({ report, days: config.reminderDays, siteUrl });
        await prisma.report.update({ where: { id: report.id }, data: { reminderSentAt: new Date() } });
      } catch (err) {
        console.error(`[promemoria] ${report.code}:`, err.message);
      }
    }
  } finally {
    running = false;
  }
}
