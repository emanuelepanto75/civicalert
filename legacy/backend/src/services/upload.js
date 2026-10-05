const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const sharp  = require('sharp');

// Cartella uploads nella root del backend
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// Crea la cartella se non esiste
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Configurazione multer ──────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Organizza per anno/mese
    const now    = new Date();
    const subDir = path.join(UPLOAD_DIR, `${now.getFullYear()}`, String(now.getMonth() + 1).padStart(2, '0'));
    if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
    cb(null, subDir);
  },
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const tipiPermessi = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'];
  if (tipiPermessi.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato file non supportato. Carica una foto (JPG, PNG, WEBP) o un video (MP4, MOV, WEBM).'));
  }
};

const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '50');

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
});

// ── Ottimizzazione immagini ────────────────────────────────────────────────
/**
 * Ridimensiona e comprime un'immagine dopo l'upload.
 * I video non vengono processati.
 * @param {string} filePath - Percorso assoluto del file caricato
 * @returns {Promise<string>} - Percorso del file ottimizzato
 */
async function ottimizzaImmagine(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const tipiImmagine = ['.jpg', '.jpeg', '.png', '.webp'];

  if (!tipiImmagine.includes(ext)) {
    return filePath; // video: non toccare
  }

  const outputPath = filePath.replace(ext, `_opt${ext}`);

  await sharp(filePath)
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, progressive: true })
    .toFile(outputPath);

  // Elimina originale e rinomina ottimizzato
  fs.unlinkSync(filePath);
  fs.renameSync(outputPath, filePath);

  return filePath;
}

/**
 * Costruisce l'URL pubblico del file partendo dal percorso assoluto.
 * @param {string} filePath - Percorso assoluto
 * @returns {string} - URL relativo (es. /uploads/2026/06/filename.jpg)
 */
function filePathToUrl(filePath) {
  const relative = path.relative(path.join(__dirname, '..', '..'), filePath);
  return '/' + relative.replace(/\\/g, '/');
}

module.exports = { upload, ottimizzaImmagine, filePathToUrl };
