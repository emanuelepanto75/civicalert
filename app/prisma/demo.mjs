// Dati dimostrativi per presentare il cruscotto dell'ufficio.
//   npm run db:demo            crea operatore e segnalazioni di prova
//   node prisma/demo.mjs --remove  cancella tutto ciò che è stato creato
// In Docker: docker compose exec app node prisma/demo.mjs [--remove]
//
// Nessuna PEC viene inviata. Tutti i dati appartengono agli utenti
// @demo.civicalert.local e si eliminano con --remove.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const prisma = new PrismaClient();
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads');
const DEMO_DIR = 'demo';
const OPERATOR_EMAIL = 'operatore@demo.civicalert.local';
const CITIZEN_EMAIL = 'cittadino@demo.civicalert.local';
const PASSWORD = process.env.DEMO_PASSWORD || 'demo-civicalert';
const ISTAT = process.env.DEMO_ISTAT || '083048'; // Messina
const CENTER = [Number(process.env.DEMO_LAT || 38.1938), Number(process.env.DEMO_LON || 15.546)];

const STREETS = [
  'Via Garibaldi', 'Viale San Martino', 'Via Cesare Battisti', 'Corso Cavour', 'Via Tommaso Cannizzaro',
  'Viale della Libertà', 'Via La Farina', 'Via Industriale', 'Viale Boccetta', 'Via Santa Cecilia',
  'Via Palermo', 'Viale Italia', 'Via Ghibellina', 'Via dei Mille', 'Viale Giostra',
];
const DESCRIPTIONS = {
  buca: ['Buca profonda vicino alle strisce pedonali', 'Avvallamento pericoloso per i motocicli', 'Asfalto sgretolato dopo la pioggia', null],
  ingombrante: ['Materasso abbandonato accanto ai cassonetti', 'Mobili lasciati sul marciapiede', null],
  illuminazione: ['Lampione spento da diversi giorni', 'Tre lampioni consecutivi non funzionanti', null],
  incidente: ['Segnale stradale abbattuto', 'Detriti in carreggiata dopo un incidente'],
  marciapiede: ['Mattonelle sollevate, rischio di inciampo', 'Marciapiede dissestato davanti alla scuola', null],
  altro: ['Tombino senza coperchio', 'Ramo pericolante sopra la strada'],
};
// [categoria, stato, giorni fa, giorni per risolvere]
const PLAN = [
  ['buca', 'SENT', 0], ['buca', 'SENT', 1], ['illuminazione', 'SENT', 1], ['ingombrante', 'SENT', 2],
  ['marciapiede', 'SENT', 3], ['buca', 'SENT', 4], ['altro', 'SENT', 2],
  ['buca', 'ACKNOWLEDGED', 5], ['illuminazione', 'ACKNOWLEDGED', 6], ['buca', 'ACKNOWLEDGED', 9],
  ['marciapiede', 'ACKNOWLEDGED', 11], ['ingombrante', 'ACKNOWLEDGED', 3],
  ['buca', 'RESOLVED', 8, 3], ['ingombrante', 'RESOLVED', 6, 1], ['illuminazione', 'RESOLVED', 14, 4],
  ['buca', 'RESOLVED', 20, 9], ['ingombrante', 'RESOLVED', 12, 2], ['incidente', 'RESOLVED', 9, 1],
  ['marciapiede', 'RESOLVED', 30, 12], ['illuminazione', 'RESOLVED', 25, 5], ['buca', 'RESOLVED', 40, 14],
  ['ingombrante', 'RESOLVED', 18, 2], ['buca', 'RESOLVED', 45, 7], ['altro', 'RESOLVED', 16, 3],
  ['incidente', 'REJECTED', 10], ['altro', 'REJECTED', 22],
];

const rand = (() => {
  let seed = 42; // sempre gli stessi dati, così le demo sono ripetibili
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
})();
const pick = (list) => list[Math.floor(rand() * list.length)];
const daysAgo = (d, hours = 0) => new Date(Date.now() - d * 86400000 - hours * 3600000);

async function demoPhoto(color, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768">
    <defs><pattern id="p" width="24" height="24" patternUnits="userSpaceOnUse">
      <rect width="24" height="24" fill="#6b7280"/><circle cx="6" cy="8" r="2" fill="#757c88"/><circle cx="17" cy="16" r="3" fill="#636a75"/>
    </pattern></defs>
    <rect width="1024" height="768" fill="url(#p)"/>
    <circle cx="512" cy="330" r="150" fill="${color}" opacity="0.9"/>
    <text x="512" y="560" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#fff" text-anchor="middle">${label}</text>
    <text x="512" y="620" font-family="Arial, sans-serif" font-size="30" fill="#e5e7eb" text-anchor="middle">FOTO DIMOSTRATIVA</text>
  </svg>`;
  const rel = path.join(DEMO_DIR, `${crypto.randomBytes(6).toString('hex')}.jpg`);
  await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toFile(path.join(UPLOAD_DIR, rel));
  return rel;
}

async function remove() {
  const users = await prisma.user.findMany({ where: { email: { endsWith: '@demo.civicalert.local' } } });
  const ids = users.map((u) => u.id);
  const { count } = await prisma.report.deleteMany({ where: { userId: { in: ids } } });
  await prisma.reportEvent.deleteMany({ where: { actorId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  fs.rmSync(path.join(UPLOAD_DIR, DEMO_DIR), { recursive: true, force: true });
  console.log(`[demo] Rimossi ${users.length} utenti demo e ${count} segnalazioni.`);
}

async function create() {
  if (await prisma.user.findUnique({ where: { email: CITIZEN_EMAIL } })) {
    console.log('[demo] I dati dimostrativi esistono già. Per ricrearli: node prisma/demo.mjs --remove, poi di nuovo node prisma/demo.mjs');
    return;
  }
  const municipality = await prisma.municipality.findUnique({ where: { istatCode: ISTAT } });
  if (!municipality) throw new Error(`Comune con codice ISTAT ${ISTAT} non trovato`);
  const categories = Object.fromEntries((await prisma.category.findMany()).map((c) => [c.slug, c]));
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const common = { passwordHash, privacyAcceptedAt: new Date(), emailVerifiedAt: new Date() };

  const operator = await prisma.user.create({
    data: { ...common, email: OPERATOR_EMAIL, phone: '', firstName: 'Ufficio', lastName: 'Manutenzioni', role: 'OPERATOR', municipalityId: municipality.id },
  });
  const citizen = await prisma.user.create({
    data: { ...common, email: CITIZEN_EMAIL, phone: '+39 000 0000000', firstName: 'Cittadino', lastName: 'Dimostrativo' },
  });

  fs.mkdirSync(path.join(UPLOAD_DIR, DEMO_DIR), { recursive: true });
  for (const [slug, status, ago, toResolve] of PLAN) {
    const category = categories[slug];
    const createdAt = daysAgo(ago, Math.floor(rand() * 10));
    const report = await prisma.report.create({
      data: {
        code: 'CA-' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6),
        userId: citizen.id,
        categoryId: category.id,
        description: pick(DESCRIPTIONS[slug]),
        mediaPath: await demoPhoto(category.color, category.name),
        mediaType: 'PHOTO',
        latitude: CENTER[0] + (rand() - 0.5) * 0.03,
        longitude: CENTER[1] + (rand() - 0.5) * 0.012,
        gpsAccuracyM: 5 + Math.round(rand() * 20),
        address: `${pick(STREETS)} ${1 + Math.floor(rand() * 120)}, ${municipality.name}`,
        municipalityId: municipality.id,
        status,
        authenticity: rand() < 0.12 ? ['GPS_IMPRECISO'] : [],
        resolvedAt: status === 'RESOLVED' ? new Date(createdAt.getTime() + toResolve * 86400000) : null,
        resolvedBy: status === 'RESOLVED' ? 'MUNICIPALITY' : null,
        createdAt,
        deliveries: {
          create: { channel: 'PEC', recipient: `${municipality.pecAddress} [demo]`, status: 'SENT', attempts: 1, sentAt: createdAt, messageId: 'demo' },
        },
      },
    });
    const events = [];
    if (status !== 'SENT') {
      const ackAt = new Date(createdAt.getTime() + 0.5 * 86400000);
      if (status !== 'REJECTED') {
        events.push({ kind: 'STATUS', fromStatus: 'SENT', toStatus: 'ACKNOWLEDGED', createdAt: ackAt, visibleToCitizen: true, note: 'Segnalazione presa in carico, sopralluogo programmato.' });
      }
      if (status === 'RESOLVED') {
        events.push({ kind: 'NOTE', note: 'Intervento assegnato alla squadra manutenzione.', createdAt: new Date(ackAt.getTime() + 3600000) });
        events.push({ kind: 'STATUS', fromStatus: 'ACKNOWLEDGED', toStatus: 'RESOLVED', createdAt: report.resolvedAt, visibleToCitizen: true, note: 'Intervento eseguito. Grazie per la segnalazione.' });
      }
      if (status === 'REJECTED') {
        events.push({ kind: 'STATUS', fromStatus: 'SENT', toStatus: 'REJECTED', createdAt: ackAt, visibleToCitizen: true, note: 'L’area è di competenza di un altro ente: la segnalazione è stata inoltrata.' });
      }
    }
    for (const e of events) await prisma.reportEvent.create({ data: { ...e, reportId: report.id, actorId: operator.id } });
  }

  console.log(`[demo] Create ${PLAN.length} segnalazioni dimostrative per il Comune di ${municipality.name}.`);
  console.log(`[demo] Accesso al cruscotto: ${OPERATOR_EMAIL} / ${PASSWORD}  →  /ufficio`);
}

try {
  if (process.argv.includes('--remove')) await remove();
  else await create();
} finally {
  await prisma.$disconnect();
}
