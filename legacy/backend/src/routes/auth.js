const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { z }    = require('zod');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// ── Schemi di validazione ─────────────────────────────────────────────────────
const schemaRegistrazione = z.object({
  nome    : z.string().min(2, 'Nome troppo corto').max(50),
  cognome : z.string().min(2, 'Cognome troppo corto').max(50),
  email   : z.string().email('Email non valida'),
  password: z.string()
              .min(8, 'Password di almeno 8 caratteri')
              .regex(/[A-Z]/, 'Deve contenere almeno una maiuscola')
              .regex(/[0-9]/, 'Deve contenere almeno un numero'),
  telefono: z.string().optional(),
});

const schemaLogin = z.object({
  email   : z.string().email(),
  password: z.string().min(1),
});

// ── Helper: genera JWT ────────────────────────────────────────────────────────
function generaToken(utente) {
  return jwt.sign(
    { id: utente.id, email: utente.email, role: utente.role, nome: utente.nome },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

// ── POST /api/auth/registrati ─────────────────────────────────────────────────
router.post('/registrati', async (req, res, next) => {
  try {
    // Validazione input
    const dati = schemaRegistrazione.parse(req.body);

    // Controlla se email già esistente
    const esistente = await prisma.user.findUnique({ where: { email: dati.email } });
    if (esistente) {
      return res.status(409).json({ error: 'Email già registrata. Prova ad accedere.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dati.password, 12);

    // Crea utente
    const utente = await prisma.user.create({
      data: {
        email       : dati.email,
        passwordHash: passwordHash,
        nome        : dati.nome,
        cognome     : dati.cognome,
        telefono    : dati.telefono || null,
        isVerified  : true, // in sviluppo: verifica disabilitata
        // in produzione: isVerified: false + invio email di conferma
      },
    });

    // In produzione qui si invierebbe l'email di verifica
    console.log(`[AUTH] Nuovo utente registrato: ${utente.email}`);

    // Genera token e rispondi
    const token = generaToken(utente);
    res.status(201).json({
      messaggio: 'Registrazione completata con successo.',
      token,
      utente: {
        id     : utente.id,
        nome   : utente.nome,
        cognome: utente.cognome,
        email  : utente.email,
        role   : utente.role,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dati non validi.', dettagli: err.errors });
    }
    next(err);
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const dati = schemaLogin.parse(req.body);

    // Trova utente
    const utente = await prisma.user.findUnique({ where: { email: dati.email } });
    if (!utente) {
      return res.status(401).json({ error: 'Email o password non corretti.' });
    }

    // Controlla ban
    if (utente.isBanned) {
      return res.status(403).json({ error: 'Account sospeso. Contatta il supporto.' });
    }

    // Verifica password
    const passwordOk = await bcrypt.compare(dati.password, utente.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Email o password non corretti.' });
    }

    // Aggiorna ultimo accesso
    await prisma.user.update({
      where: { id: utente.id },
      data : { lastLogin: new Date() },
    });

    const token = generaToken(utente);
    console.log(`[AUTH] Login: ${utente.email}`);

    res.json({
      token,
      utente: {
        id     : utente.id,
        nome   : utente.nome,
        cognome: utente.cognome,
        email  : utente.email,
        role   : utente.role,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dati non validi.' });
    }
    next(err);
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const utente = await prisma.user.findUnique({
      where : { id: req.user.id },
      select: { id: true, nome: true, cognome: true, email: true, telefono: true, role: true, createdAt: true },
    });
    if (!utente) return res.status(404).json({ error: 'Utente non trovato.' });
    res.json(utente);
  } catch (err) { next(err); }
});

module.exports = router;
