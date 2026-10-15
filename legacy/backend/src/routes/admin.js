const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Tutte le route admin richiedono autenticazione e ruolo ADMIN
router.use(requireAuth);
router.use(requireRole('ADMIN'));

// ── Statistiche ──────────────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [totaleReport, totaleUtenti, totaleComuni, totalePecInviate, perStato] =
      await Promise.all([
        prisma.report.count(),
        prisma.user.count(),
        prisma.municipality.count({ where: { isActive: true } }),
        prisma.report.count({ where: { pecSent: true } }),
        prisma.report.groupBy({ by: ['status'], _count: { status: true } }),
      ]);

    const perStatoObj = {};
    perStato.forEach(s => { perStatoObj[s.status] = s._count.status; });

    res.json({ totaleReport, totaleUtenti, totaleComuni, totalePecInviate, perStato: perStatoObj });
  } catch (err) { next(err); }
});

// ── Comuni ───────────────────────────────────────────────────────────────────
router.get('/comuni', async (req, res, next) => {
  try {
    const comuni = await prisma.municipality.findMany({
      orderBy: [{ region: 'asc' }, { name: 'asc' }],
    });
    res.json(comuni);
  } catch (err) { next(err); }
});

router.post('/comuni', async (req, res, next) => {
  try {
    const { name, province, region, istatCode, pecAddress, whatsappNumber,
            notifyPec, notifyWhatsapp, isActive } = req.body;
    if (!name || !istatCode) {
      return res.status(400).json({ error: 'Nome e codice ISTAT sono obbligatori.' });
    }
    const comune = await prisma.municipality.create({
      data: { name, province: province||'', region: region||'', istatCode,
              pecAddress: pecAddress||null, whatsappNumber: whatsappNumber||null,
              notifyPec: notifyPec !== false, notifyWhatsapp: !!notifyWhatsapp,
              isActive: isActive !== false },
    });
    res.status(201).json(comune);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Codice ISTAT già esistente.' });
    next(err);
  }
});

router.patch('/comuni/:id', async (req, res, next) => {
  try {
    const { name, province, region, istatCode, pecAddress, whatsappNumber,
            notifyPec, notifyWhatsapp, isActive } = req.body;
    const comune = await prisma.municipality.update({
      where: { id: req.params.id },
      data : { name, province, region, istatCode, pecAddress: pecAddress||null,
               whatsappNumber: whatsappNumber||null, notifyPec, notifyWhatsapp, isActive },
    });
    res.json(comune);
  } catch (err) { next(err); }
});

// ── Categorie ────────────────────────────────────────────────────────────────
router.get('/categorie', async (req, res, next) => {
  try {
    const categorie = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json(categorie);
  } catch (err) { next(err); }
});

router.post('/categorie', async (req, res, next) => {
  try {
    const { name, icon, sortOrder, isActive } = req.body;
    if (!name) return res.status(400).json({ error: 'Il nome è obbligatorio.' });
    const cat = await prisma.category.create({
      data: { name, icon: icon||'plus', sortOrder: sortOrder||0, isActive: isActive !== false },
    });
    res.status(201).json(cat);
  } catch (err) { next(err); }
});

router.patch('/categorie/:id', async (req, res, next) => {
  try {
    const { name, icon, sortOrder, isActive } = req.body;
    const cat = await prisma.category.update({
      where: { id: req.params.id },
      data : { name, icon, sortOrder, isActive },
    });
    res.json(cat);
  } catch (err) { next(err); }
});

// ── Utenti ───────────────────────────────────────────────────────────────────
router.get('/utenti', async (req, res, next) => {
  try {
    const utenti = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select : { id: true, nome: true, cognome: true, email: true, telefono: true,
                 role: true, isVerified: true, isBanned: true, createdAt: true, lastLogin: true },
    });
    res.json(utenti);
  } catch (err) { next(err); }
});

router.patch('/utenti/:id/ban', async (req, res, next) => {
  try {
    const { isBanned } = req.body;
    const utente = await prisma.user.update({
      where : { id: req.params.id },
      data  : { isBanned: !!isBanned },
      select: { id: true, nome: true, cognome: true, isBanned: true },
    });
    res.json(utente);
  } catch (err) { next(err); }
});

router.patch('/utenti/:id/ruolo', async (req, res, next) => {
  try {
    const { role } = req.body;
    const ruoliValidi = ['CITIZEN', 'OPERATOR', 'ADMIN'];
    if (!ruoliValidi.includes(role)) {
      return res.status(400).json({ error: 'Ruolo non valido.' });
    }
    const utente = await prisma.user.update({
      where : { id: req.params.id },
      data  : { role },
      select: { id: true, nome: true, cognome: true, role: true },
    });
    res.json(utente);
  } catch (err) { next(err); }
});

module.exports = router;
