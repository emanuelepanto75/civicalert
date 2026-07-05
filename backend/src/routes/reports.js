const express  = require('express');
const { z }    = require('zod');
const path     = require('path');
const { PrismaClient } = require('@prisma/client');

const { requireAuth }                   = require('../middleware/authMiddleware');
const { reverseGeocode }                = require('../services/geocoding');
const { inviaPEC, pecConfigurata }      = require('../services/pec');
const { upload, ottimizzaImmagine, filePathToUrl } = require('../services/upload');

const router = express.Router();
const prisma = new PrismaClient();

// ── Schema validazione segnalazione ──────────────────────────────────────────
const schemaSegnalazione = z.object({
  categoryId : z.string().uuid('ID categoria non valido'),
  latitude   : z.coerce.number().min(-90).max(90),
  longitude  : z.coerce.number().min(-180).max(180),
  description: z.string().max(1000).optional(),
});

// ── POST /api/reports ─────────────────────────────────────────────────────────
// Crea nuova segnalazione — richiede login + file allegato
router.post(
  '/',
  requireAuth,
  upload.single('media'),   // campo "media" nel form-data
  async (req, res, next) => {
    try {
      // Validazione campi
      const dati = schemaSegnalazione.parse(req.body);

      // Verifica che la categoria esista
      const categoria = await prisma.category.findUnique({
        where: { id: dati.categoryId },
      });
      if (!categoria) {
        return res.status(400).json({ error: 'Categoria non valida.' });
      }

      // ── Gestione file media ───────────────────────────────────────────────
      let mediaUrl  = null;
      let mediaType = null;
      let mediaPath = null;

      if (req.file) {
        mediaPath = req.file.path;

        // Ottimizza immagini (i video vengono saltati)
        await ottimizzaImmagine(mediaPath);

        mediaUrl  = filePathToUrl(mediaPath);
        mediaType = req.file.mimetype.startsWith('image/') ? 'PHOTO' : 'VIDEO';
      }

      // ── Reverse geocoding ─────────────────────────────────────────────────
      let addressResolved  = null;
      let municipalityId   = null;

      try {
        const geo = await reverseGeocode(dati.latitude, dati.longitude);
        addressResolved = geo.indirizzo;

        // Cerca il comune nel database per nome
        if (geo.comune) {
          const comune = await prisma.municipality.findFirst({
            where: {
              isActive: true,
              name    : { contains: geo.comune, mode: 'insensitive' },
            },
          });
          if (comune) municipalityId = comune.id;
        }
      } catch (geoErr) {
        console.warn('[GEOCODING] Errore:', geoErr.message);
        // Non blocchiamo la segnalazione se il geocoding fallisce
      }

      // ── Salva la segnalazione ─────────────────────────────────────────────
      const segnalazione = await prisma.report.create({
        data: {
          userId         : req.user.id,
          categoryId     : dati.categoryId,
          description    : dati.description || null,
          mediaUrl,
          mediaType,
          latitude       : dati.latitude,
          longitude      : dati.longitude,
          addressResolved,
          municipalityId,
          status         : 'PENDING',
        },
        include: {
          category    : true,
          municipality: true,
          user        : { select: { nome: true, cognome: true, email: true } },
        },
      });

      // ── Invio PEC ─────────────────────────────────────────────────────────
      if (pecConfigurata() && segnalazione.municipality?.pecAddress && segnalazione.municipality?.notifyPec) {
        try {
          const risultatoPec = await inviaPEC({
            destinatario: segnalazione.municipality.pecAddress,
            report      : segnalazione,
            utente      : segnalazione.user,
            mediaPath   : mediaPath || null,
          });

          // Aggiorna stato PEC
          await prisma.report.update({
            where: { id: segnalazione.id },
            data : {
              status      : 'SENT',
              pecSent     : true,
              pecMessageId: risultatoPec.messageId,
              pecSentAt   : new Date(),
            },
          });

          segnalazione.status       = 'SENT';
          segnalazione.pecSent      = true;
          segnalazione.pecMessageId = risultatoPec.messageId;

          console.log(`[REPORT] Segnalazione ${segnalazione.id} inviata via PEC a ${segnalazione.municipality.pecAddress}`);
        } catch (pecErr) {
          console.error('[PEC] Errore invio:', pecErr.message);
          // La segnalazione è salvata anche se la PEC fallisce
        }
      } else if (!segnalazione.municipality) {
        console.warn(`[REPORT] Comune non trovato per coordinate ${dati.latitude}, ${dati.longitude}`);
      }

      // ── Risposta ──────────────────────────────────────────────────────────
      const idBreve = segnalazione.id.slice(0, 8).toUpperCase();
      res.status(201).json({
        messaggio : 'Segnalazione inviata con successo.',
        id        : `SEG-${idBreve}`,
        uuid      : segnalazione.id,
        stato     : segnalazione.status,
        pecInviata: segnalazione.pecSent,
        indirizzo : addressResolved,
        comune    : segnalazione.municipality?.name || null,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Dati non validi.', dettagli: err.errors });
      }
      next(err);
    }
  }
);

// ── GET /api/reports ──────────────────────────────────────────────────────────
// Lista pubblica delle segnalazioni (dati utente oscurati) con filtri
router.get('/', async (req, res, next) => {
  try {
    const { comune, categoria, stato, mese, anno, pagina = 1, limite = 20 } = req.query;

    const where = {};
    if (comune)    where.municipality = { name: { contains: comune, mode: 'insensitive' } };
    if (categoria) where.categoryId   = categoria;
    if (stato)     where.status       = stato;
    if (mese && anno) {
      const dataInizio = new Date(parseInt(anno), parseInt(mese) - 1, 1);
      const dataFine   = new Date(parseInt(anno), parseInt(mese), 1);
      where.createdAt  = { gte: dataInizio, lt: dataFine };
    }

    const [totale, segnalazioni] = await prisma.$transaction([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip   : (parseInt(pagina) - 1) * parseInt(limite),
        take   : parseInt(limite),
        select : {
          id             : true,
          mediaUrl       : true,
          mediaType      : true,
          latitude       : true,
          longitude      : true,
          addressResolved: true,
          status         : true,
          description    : true,
          createdAt      : true,
          category       : { select: { name: true, icon: true } },
          municipality   : { select: { name: true, province: true } },
          // utente oscurato nella vista pubblica
        },
      }),
    ]);

    res.json({
      totale,
      pagina  : parseInt(pagina),
      limite  : parseInt(limite),
      pagine  : Math.ceil(totale / parseInt(limite)),
      dati    : segnalazioni,
    });
  } catch (err) { next(err); }
});

// ── GET /api/reports/mie ──────────────────────────────────────────────────────
// Segnalazioni dell'utente loggato (dati completi)
router.get('/mie', requireAuth, async (req, res, next) => {
  try {
    const segnalazioni = await prisma.report.findMany({
      where  : { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        category    : true,
        municipality: { select: { name: true, province: true } },
      },
    });
    res.json(segnalazioni);
  } catch (err) { next(err); }
});

// ── GET /api/reports/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const segnalazione = await prisma.report.findUnique({
      where  : { id: req.params.id },
      include: {
        category    : true,
        municipality: { select: { name: true, province: true, region: true } },
      },
    });
    if (!segnalazione) return res.status(404).json({ error: 'Segnalazione non trovata.' });
    res.json(segnalazione);
  } catch (err) { next(err); }
});

// ── PATCH /api/reports/:id/stato ─────────────────────────────────────────────
// Aggiorna stato (solo operatori e admin)
const { requireRole } = require('../middleware/authMiddleware');

router.patch('/:id/stato', requireAuth, requireRole('OPERATOR', 'ADMIN'), async (req, res, next) => {
  try {
    const { stato } = req.body;
    const statiValidi = ['PENDING', 'SENT', 'ACKNOWLEDGED', 'RESOLVED', 'REJECTED'];
    if (!statiValidi.includes(stato)) {
      return res.status(400).json({ error: 'Stato non valido.' });
    }

    const segnalazione = await prisma.report.update({
      where: { id: req.params.id },
      data : { status: stato },
    });
    res.json({ messaggio: 'Stato aggiornato.', segnalazione });
  } catch (err) { next(err); }
});

module.exports = router;
