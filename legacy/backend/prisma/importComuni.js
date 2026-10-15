/**
 * Script di import comuni italiani con PEC
 * Fonte: IPA (Indice dei domicili digitali PA) via opendatasicilia
 *
 * Posizione: civicalert/backend/prisma/importComuni.js
 *
 * Esecuzione:
 *   node prisma/importComuni.js
 *
 * Lo script:
 * 1. Legge i file CSV pec.csv e comuni.csv nella stessa cartella
 * 2. Li unisce per codice ISTAT
 * 3. Importa tutti i comuni nel database (skippa i duplicati)
 * 4. Mostra un riepilogo finale
 */

const { PrismaClient } = require('@prisma/client');
const fs   = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// ── Parser CSV minimale ───────────────────────────────────────────────────────
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines   = content.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/\r/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj    = {};
    headers.forEach((h, i) => { obj[h] = (values[i] || '').trim().replace(/\r/g, ''); });
    return obj;
  });
}

// ── Normalizza codice ISTAT a 6 cifre con zero-padding ───────────────────────
function padIstat(code) {
  return String(code || '').padStart(6, '0');
}

async function main() {
  const DIR = path.join(__dirname);

  // Percorsi file CSV
  const pecPath     = path.join(DIR, 'pec.csv');
  const comuniPath  = path.join(DIR, 'comuni.csv');

  if (!fs.existsSync(pecPath) || !fs.existsSync(comuniPath)) {
    console.error('\n❌ File CSV non trovati nella cartella prisma/');
    console.error('   Scarica i file e mettili in civicalert/backend/prisma/:');
    console.error('   - pec.csv     da: https://raw.githubusercontent.com/opendatasicilia/comuni-italiani/main/dati/pec.csv');
    console.error('   - comuni.csv  da: https://raw.githubusercontent.com/opendatasicilia/comuni-italiani/main/dati/comuni.csv\n');
    process.exit(1);
  }

  console.log('\n🏛  Avvio import comuni italiani con PEC...\n');

  // Leggi CSV
  const pecRows    = parseCSV(pecPath);
  const comuniRows = parseCSV(comuniPath);

  console.log(`📄 Trovati ${comuniRows.length} comuni e ${pecRows.length} record PEC`);

  // Crea mappa PEC per codice ISTAT
  const pecMap = {};
  pecRows.forEach(r => {
    const istat = padIstat(r.pro_com_t);
    if (r.pec) pecMap[istat] = r.pec.trim();
  });

  // Unisci i dati
  const comuniCompleti = comuniRows.map(c => {
    const istat = padIstat(c.pro_com_t);
    return {
      name          : (c.comune || '').trim(),
      province      : (c.den_prov || '').trim(),
      region        : (c.den_reg || '').trim(),
      istatCode     : istat,
      pecAddress    : pecMap[istat] || null,
      notifyPec     : !!pecMap[istat],
      notifyWhatsapp: false,
      isActive      : true,
    };
  }).filter(c => c.name && c.istatCode);

  const conPec    = comuniCompleti.filter(c => c.pecAddress).length;
  const senzaPec  = comuniCompleti.length - conPec;

  console.log(`✓ ${comuniCompleti.length} comuni da importare`);
  console.log(`  - Con PEC:    ${conPec}`);
  console.log(`  - Senza PEC:  ${senzaPec}`);
  console.log('\n⏳ Import in corso (potrebbe richiedere qualche secondo)...\n');

  // Import in batch da 100 per non sovraccaricare il DB
  const BATCH = 100;
  let importati  = 0;
  let saltati    = 0;
  let errori     = 0;

  for (let i = 0; i < comuniCompleti.length; i += BATCH) {
    const batch = comuniCompleti.slice(i, i + BATCH);

    try {
      const result = await prisma.municipality.createMany({
        data          : batch,
        skipDuplicates: true, // salta i comuni già presenti per codice ISTAT
      });
      importati += result.count;
      saltati   += batch.length - result.count;
    } catch (err) {
      console.error(`  ⚠ Errore nel batch ${i}-${i+BATCH}:`, err.message);
      // Prova uno per uno per identificare il record problematico
      for (const c of batch) {
        try {
          await prisma.municipality.upsert({
            where : { istatCode: c.istatCode },
            update: { pecAddress: c.pecAddress, notifyPec: c.notifyPec },
            create: c,
          });
          importati++;
        } catch {
          errori++;
        }
      }
    }

    // Progress ogni 500 comuni
    if ((i + BATCH) % 500 === 0 || i + BATCH >= comuniCompleti.length) {
      const perc = Math.min(100, Math.round(((i + BATCH) / comuniCompleti.length) * 100));
      process.stdout.write(`\r  Progresso: ${perc}% (${Math.min(i + BATCH, comuniCompleti.length)}/${comuniCompleti.length})`);
    }
  }

  console.log('\n');

  // Riepilogo finale
  const totaleDB = await prisma.municipality.count();
  const conPecDB = await prisma.municipality.count({ where: { pecAddress: { not: null } } });

  console.log('═══════════════════════════════════════');
  console.log('✅ Import completato!');
  console.log('═══════════════════════════════════════');
  console.log(`  Nuovi comuni importati:  ${importati}`);
  console.log(`  Già presenti (saltati):  ${saltati}`);
  if (errori > 0) console.log(`  Errori:                  ${errori}`);
  console.log('───────────────────────────────────────');
  console.log(`  Totale comuni nel DB:    ${totaleDB}`);
  console.log(`  Comuni con PEC attiva:   ${conPecDB}`);
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch(err => {
    console.error('\n❌ Errore fatale:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
