/**
 * Seed del database – popola categorie di default e comuni di test.
 * Esegui con: npm run db:seed
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Avvio seed database CivicAlert...\n');

  // ── Categorie predefinite ───────────────────────────────────────────────────
  const categorie = [
    { name: 'Buca / Dissesto stradale', icon: 'road',  isPredefined: true, sortOrder: 1 },
    { name: 'Oggetto ingombrante',      icon: 'trash', isPredefined: true, sortOrder: 2 },
    { name: 'Illuminazione guasta',     icon: 'lamp',  isPredefined: true, sortOrder: 3 },
    { name: 'Incidente stradale',       icon: 'crash', isPredefined: true, sortOrder: 4 },
    { name: 'Altro problema',           icon: 'plus',  isPredefined: true, sortOrder: 5 },
  ];

  for (const cat of categorie) {
    await prisma.category.upsert({
      where : { id: cat.name }, // workaround: usiamo un find
      update: {},
      create: cat,
    }).catch(async () => {
      // Se upsert fallisce, usa createMany con skipDuplicates
    });
  }

  // Alternativa più robusta
  await prisma.category.createMany({
    data          : categorie,
    skipDuplicates: true,
  });

  console.log(`✓ ${categorie.length} categorie create`);

  // ── Comuni di test ──────────────────────────────────────────────────────────
  // Inserisci qui i comuni che vuoi testare in locale.
  // In produzione importerai il file Excel con tutte le 7.902 PEC italiane.
  const comuniTest = [
    {
      name          : 'Roma',
      province      : 'Roma',
      region        : 'Lazio',
      istatCode     : '058091',
      pecAddress    : process.env.PEC_TEST_RECIPIENT || 'test@test.pec.it',
      notifyPec     : true,
      notifyWhatsapp: false,
    },
    {
      name          : 'Milano',
      province      : 'Milano',
      region        : 'Lombardia',
      istatCode     : '015146',
      pecAddress    : process.env.PEC_TEST_RECIPIENT || 'test@test.pec.it',
      notifyPec     : true,
      notifyWhatsapp: false,
    },
    {
      name          : 'Messina',
      province      : 'Messina',
      region        : 'Sicilia',
      istatCode     : '083048',
      pecAddress    : process.env.PEC_TEST_RECIPIENT || 'test@test.pec.it',
      notifyPec     : true,
      notifyWhatsapp: false,
    },
    {
      name          : 'Palermo',
      province      : 'Palermo',
      region        : 'Sicilia',
      istatCode     : '082053',
      pecAddress    : process.env.PEC_TEST_RECIPIENT || 'test@test.pec.it',
      notifyPec     : true,
      notifyWhatsapp: false,
    },
    {
      name          : 'Napoli',
      province      : 'Napoli',
      region        : 'Campania',
      istatCode     : '063049',
      pecAddress    : process.env.PEC_TEST_RECIPIENT || 'test@test.pec.it',
      notifyPec     : true,
      notifyWhatsapp: false,
    },
  ];

  await prisma.municipality.createMany({
    data          : comuniTest,
    skipDuplicates: true,
  });

  console.log(`✓ ${comuniTest.length} comuni di test creati`);
  console.log('\n✅ Seed completato!\n');
  console.log('💡 Tutti i comuni di test usano come PEC:');
  console.log(`   ${process.env.PEC_TEST_RECIPIENT || 'test@test.pec.it (configura PEC_TEST_RECIPIENT nel file .env)'}`);
}

main()
  .catch(err => { console.error('❌ Errore seed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
