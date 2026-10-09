import crypto from 'node:crypto';
import { config } from './config';
import { prisma } from './db';
import { mediaUrl } from './media';

const OPEN_STATUSES = ['PENDING', 'SENT', 'ACKNOWLEDGED'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // senza 0/O/1/I

export function newReportCode() {
  const bytes = crypto.randomBytes(6);
  return 'CA-' + Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export function distanceMeters(lat1, lon1, lat2, lon2) {
  const rad = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Stesso problema già segnalato: segnalazioni ancora aperte della stessa
 * categoria entro DUPLICATE_RADIUS_M. Non blocca l'invio (il Comune deve sapere
 * che più cittadini lo segnalano), tranne quando a ripeterla è lo stesso utente.
 * Restituisce null se non ce ne sono, altrimenti la prima segnalazione del
 * problema (`first`), quante sono finora (`count`), la più vicina e se una è
 * dell'utente stesso (`mine`).
 */
export async function findSameProblem({ categoryId, latitude, longitude, userId }) {
  const radius = config.duplicateRadiusM;
  // Prefiltro su un riquadro di coordinate (veloce), poi distanza esatta.
  const dLat = radius / 111320;
  const dLon = radius / (111320 * Math.cos((latitude * Math.PI) / 180));
  const nearby = (
    await prisma.report.findMany({
      where: {
        categoryId,
        status: { in: OPEN_STATUSES },
        latitude: { gte: latitude - dLat, lte: latitude + dLat },
        longitude: { gte: longitude - dLon, lte: longitude + dLon },
      },
      select: { id: true, code: true, userId: true, latitude: true, longitude: true, createdAt: true, duplicateOfId: true },
    })
  )
    .map((r) => ({ ...r, distance: distanceMeters(latitude, longitude, r.latitude, r.longitude) }))
    .filter((r) => r.distance <= radius);
  if (nearby.length === 0) return null;

  const oldest = nearby.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
  const firstId = oldest.duplicateOfId || oldest.id;
  const [first, count] = await Promise.all([
    prisma.report.findUnique({ where: { id: firstId }, select: { id: true, code: true, createdAt: true } }),
    prisma.report.count({ where: { OR: [{ id: firstId }, { duplicateOfId: firstId }] } }),
  ]);
  const nearest = nearby.reduce((a, b) => (a.distance <= b.distance ? a : b));
  return {
    first,
    count,
    nearest: { code: nearest.code, distance: nearest.distance },
    mine: nearby.find((r) => r.userId === userId) || null,
  };
}

// Anti-spam: numero massimo di segnalazioni per utente nelle ultime 24 ore.
export async function reportsLeftToday(userId) {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const count = await prisma.report.count({ where: { userId, createdAt: { gte: since } } });
  return Math.max(0, config.maxReportsPerDay - count);
}

// Controlli di autenticità non bloccanti: restano annotati sulla segnalazione.
export function authenticityFlags({ exif, latitude, longitude, gpsAccuracyM }) {
  const flags = [];
  let photoGpsDistM = null;
  if (exif?.lat != null && exif?.lon != null) {
    photoGpsDistM = distanceMeters(latitude, longitude, exif.lat, exif.lon);
    if (photoGpsDistM > 1000) flags.push('FOTO_SCATTATA_ALTROVE');
  }
  if (exif?.takenAt && Date.now() - new Date(exif.takenAt).getTime() > 7 * 24 * 3600 * 1000) {
    flags.push('FOTO_VECCHIA');
  }
  if (gpsAccuracyM != null && gpsAccuracyM > 100) flags.push('GPS_IMPRECISO');
  return { flags, photoGpsDistM };
}

export const STATUS_LABELS = {
  PENDING: 'In attesa di invio',
  SENT: 'PEC inviata al Comune',
  ACKNOWLEDGED: 'Presa in carico',
  RESOLVED: 'Risolta',
  REJECTED: 'Respinta',
};

// Vista pubblica: nessun dato personale del segnalante (GDPR).
export function publicReport(report, { includeOwner = false, viewerId = null } = {}) {
  return {
    code: report.code,
    category: report.category && {
      name: report.category.name,
      icon: report.category.icon,
      color: report.category.color,
    },
    description: report.description,
    mediaUrl: mediaUrl(report.mediaPath),
    mediaType: report.mediaType,
    latitude: report.latitude,
    longitude: report.longitude,
    address: report.address,
    municipality: report.municipality?.name || null,
    status: report.status,
    statusLabel: STATUS_LABELS[report.status],
    createdAt: report.createdAt,
    resolvedAt: report.resolvedAt,
    resolvedBy: report.resolvedBy,
    isMine: viewerId != null && report.userId === viewerId,
    ...(includeOwner && {
      deliveries: report.deliveries?.map((d) => ({
        channel: d.channel,
        recipient: d.recipient,
        status: d.status,
        sentAt: d.sentAt,
        attempts: d.attempts,
      })),
    }),
  };
}
