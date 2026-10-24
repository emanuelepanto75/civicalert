import { config } from './config';
import { prisma } from './db';
import { deleteMedia } from './media';

const DAY = 86400000;
const OPEN = ['REVIEW', 'PENDING', 'SENT', 'ACKNOWLEDGED'];
let running = false;

/**
 * Applica i tempi di conservazione dichiarati nell'informativa privacy:
 * - segnalazioni (con foto/video) senza aggiornamenti da REPORT_RETENTION_YEARS anni;
 * - account dei cittadini senza accessi da INACTIVE_ACCOUNT_MONTHS mesi e senza
 *   segnalazioni aperte (le loro segnalazioni restano, anonime, fino alla scadenza);
 * - registrazioni mai confermate dopo UNVERIFIED_ACCOUNT_DAYS giorni.
 */
export async function processRetention() {
  if (running) return;
  running = true;
  try {
    const { reportYears, inactiveAccountMonths, unverifiedAccountDays } = config.retention;
    const now = Date.now();

    const oldReports = await prisma.report.findMany({
      where: { updatedAt: { lt: new Date(now - reportYears * 365 * DAY) } },
      select: { id: true, mediaPath: true },
      take: 500,
    });
    for (const r of oldReports) {
      await prisma.report.delete({ where: { id: r.id } });
      await deleteMedia(r.mediaPath).catch(() => {});
    }

    const inactiveSince = new Date(now - inactiveAccountMonths * 30 * DAY);
    const { count: inactive } = await prisma.user.deleteMany({
      where: {
        role: 'CITIZEN',
        emailVerifiedAt: { not: null },
        OR: [{ lastLoginAt: { lt: inactiveSince } }, { lastLoginAt: null, createdAt: { lt: inactiveSince } }],
        reports: { none: { status: { in: OPEN } } },
      },
    });

    const { count: unverified } = await prisma.user.deleteMany({
      where: {
        role: 'CITIZEN',
        emailVerifiedAt: null,
        createdAt: { lt: new Date(now - unverifiedAccountDays * DAY) },
      },
    });

    if (oldReports.length || inactive || unverified) {
      console.log(
        `[conservazione] eliminate ${oldReports.length} segnalazioni scadute, ${inactive} account inattivi, ${unverified} registrazioni non confermate`,
      );
    }
  } finally {
    running = false;
  }
}
