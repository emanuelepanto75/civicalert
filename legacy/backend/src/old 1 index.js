const express    = require('express');
const cors       = require('cors');
const path       = require('path');
require('dotenv').config();

const authRoutes    = require('./routes/auth');
const reportsRoutes = require('./routes/reports');
const categoriesRoutes = require('./routes/categories');
const { errorHandler } = require('./middleware/errorHandler');

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

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
app.use('/api/categories', categoriesRoutes);

// ── Route ─────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status : 'ok',
    app    : 'CivicAlert Backend',
    version: '1.0.0',
    time   : new Date().toISOString(),
  });
});

app.use('/api/auth',    authRoutes);
app.use('/api/reports', reportsRoutes);

// ── Error handler globale ─────────────────────────────────────────────────────
app.use(errorHandler);

// ── Avvio ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ CivicAlert Backend in ascolto su http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});
