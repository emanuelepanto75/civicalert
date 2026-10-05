// Popola il database: categorie predefinite, comuni italiani con PEC, admin opzionale.
// È idempotente: si può eseguire a ogni avvio.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nameKey } from '../src/lib/normalize.mjs';

const prisma = new PrismaClient();
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');

const CATEGORIES = [
  { slug: 'buca', name: 'Buca / Dissesto stradale', icon: '🕳️', color: '#ea580c' },
  { slug: 'ingombrante', name: 'Oggetto ingombrante', icon: '🗑️', color: '#2563eb' },
  { slug: 'illuminazione', name: 'Illuminazione guasta', icon: '💡', color: '#ca8a04' },
  { slug: 'incidente', name: 'Incidente stradale', icon: '⚠️', color: '#dc2626' },
  { slug: 'marciapiede', name: 'Marciapiede dissestato', icon: '🧱', color: '#7c3aed' },
  { slug: 'altro', name: 'Altro problema', icon: '➕', color: '#4b5563' },
];

function readCsv(file) {
  const [header, ...lines] = fs
    .readFileSync(path.join(DATA_DIR, file), 'utf-8')
    .split(/\r?\n/)
    .filter((l) => l.trim());
  const keys = header.split(',');
  return lines.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(keys.map((k, i) => [k.trim(), (values[i] || '').trim()]));
  });
}

async function seedCategories() {
  for (const [i, c] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, isPredefined: true, sortOrder: i },
    });
  }
}

async function seedMunicipalities() {
  if ((await prisma.municipality.count()) > 0) return;

  const pec = new Map(
    readCsv('pec.csv').map((r) => [r.pro_com_t.padStart(6, '0'), r.pec.toLowerCase()]),
  );
  const rows = readCsv('comuni.csv').map((c) => {
    const istat = c.pro_com_t.padStart(6, '0');
    return {
      name: c.comune,
      province: c.den_prov,
      provinceCode: c.sigla,
      region: c.den_reg,
      istatCode: istat,
      nameKey: nameKey(c.comune),
      pecAddress: pec.get(istat) || null,
      notifyPec: pec.has(istat),
    };
  });

  for (let i = 0; i < rows.length; i += 500) {
    await prisma.municipality.createMany({ data: rows.slice(i, i + 500), skipDuplicates: true });
  }
  console.log(`[seed] Importati ${rows.length} comuni (${pec.size} con PEC)`);
}

async function seedAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
  const email = ADMIN_EMAIL.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) return;
  await prisma.user.create({
    data: {
      email,
      phone: '',
      firstName: 'Amministratore',
      lastName: 'CivicAlert',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      privacyAcceptedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`[seed] Creato utente admin ${email}`);
}

try {
  await seedCategories();
  await seedMunicipalities();
  await seedAdmin();
} finally {
  await prisma.$disconnect();
}
