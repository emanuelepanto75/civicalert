const express    = require('express');
const cors       = require('cors');
const path       = require('path');
require('dotenv').config();

const authRoutes       = require('./routes/auth');
const reportsRoutes    = require('./routes/reports');
const categoriesRoutes = require('./routes/categories');
const adminRoutes      = require('./routes/admin');
const { errorHandler } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Middleware globali ────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cartella uploads accessibile via URL
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Route ─────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status : 'ok',
    app    : 'CivicAlert Backend',
    version: '1.0.0',
    time   : new Date().toISOString(),
  });
});

app.use('/api/auth',       authRoutes);
app.use('/api/reports',    reportsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/admin',      adminRoutes);

// ── Cerca comune per nome (usato dalla pagina segnalazione) ──────────────────
const { PrismaClient } = require('@prisma/client');
const prismaSearch = new PrismaClient();
app.get('/api/comuni/cerca', async (req, res) => {
  try {
    const { nome } = req.query;
    if (!nome) return res.status(400).json({ error: 'Nome mancante' });
    const comune = await prismaSearch.municipality.findFirst({
      where : { isActive: true, name: { contains: nome, mode: 'insensitive' } },
      select: { id: true, name: true, pecAddress: true, notifyPec: true },
    });
    if (!comune || !comune.pecAddress) return res.status(404).json({ error: 'Comune non trovato' });
    res.json(comune);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Error handler globale ─────────────────────────────────────────────────────
app.use(errorHandler);

// ── Avvio ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ CivicAlert Backend in ascolto su http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});
