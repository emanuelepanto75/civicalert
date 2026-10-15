// Gestione degli utenti di prova.
//   node prisma/utenti.mjs                         elenca tutti gli utenti
//   node prisma/utenti.mjs --elimina EMAIL [EMAIL…]  elimina utenti, loro segnalazioni e foto
// In Docker: docker compose exec app node prisma/utenti.mjs [...]
//
// Gli amministratori non si eliminano da qui. Gli utenti demo
// (@demo.civicalert.local) si eliminano con: node prisma/demo.mjs --remove
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads');

async function list() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { reports: true } } },
  });
  if (!users.length) return console.log('Nessun utente.');
  console.log('EMAIL'.padEnd(42), 'RUOLO'.padEnd(9), 'SEGN.'.padEnd(6), 'REGISTRATO IL');
  for (const u of users) {
    console.log(u.email.padEnd(42), u.role.padEnd(9), String(u._count.reports).padEnd(6), u.createdAt.toLocaleString('it-IT'));
  }
  console.log(`\nTotale: ${users.length} utenti.`);
}

async function remove(emails) {
  if (!emails.length) throw new Error('Indica almeno un indirizzo email dopo --elimina');
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email }, include: { reports: true } });
    if (!user) {
      console.log(`- ${email}: non trovato`);
      continue;
    }
    if (user.role === 'ADMIN') {
      console.log(`- ${email}: è un amministratore, non eliminato`);
      continue;
    }
    for (const r of user.reports) {
      if (r.mediaPath) fs.rmSync(path.join(UPLOAD_DIR, r.mediaPath), { force: true });
    }
    // Eventi e invii delle segnalazioni si cancellano a cascata
    await prisma.report.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`- ${email}: eliminato con ${user.reports.length} segnalazioni`);
  }
}

try {
  const i = process.argv.indexOf('--elimina');
  if (i >= 0) await remove(process.argv.slice(i + 1));
  else await list();
} finally {
  await prisma.$disconnect();
}
