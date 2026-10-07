import path from 'node:path';

const int = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');

// Tutti i parametri regolabili da variabili d'ambiente (vedi .env.example).
export const config = {
  dataDir: DATA_DIR,
  uploadDir: process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads'),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  sessionHours: int(process.env.SESSION_HOURS, 24 * 7),
  requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION !== 'false',
  maxLoginAttempts: int(process.env.MAX_LOGIN_ATTEMPTS, 5),
  loginLockMinutes: int(process.env.LOGIN_LOCK_MINUTES, 15),
  maxReportsPerDay: int(process.env.MAX_REPORTS_PER_DAY, 5),
  duplicateRadiusM: int(process.env.DUPLICATE_RADIUS_M, 50),
  maxGpsAccuracyM: int(process.env.MAX_GPS_ACCURACY_M, 200),
  maxUploadMb: int(process.env.MAX_UPLOAD_MB, 50),
  maxImageSidePx: int(process.env.MAX_IMAGE_SIDE_PX, 2048),
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: int(process.env.SMTP_PORT, 1025),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  mailFrom: process.env.MAIL_FROM || 'CivicAlerts <segnalazioni@civicalert.local>',
  // Casella PEC per le segnalazioni ai Comuni. Se non configurata si usa la
  // casella normale (in locale: Mailpit).
  pecSmtp: {
    host: process.env.PEC_SMTP_HOST || process.env.SMTP_HOST || 'localhost',
    port: int(process.env.PEC_SMTP_PORT || process.env.SMTP_PORT, 1025),
    user: process.env.PEC_SMTP_HOST ? process.env.PEC_SMTP_USER || '' : process.env.SMTP_USER || '',
    pass: process.env.PEC_SMTP_HOST ? process.env.PEC_SMTP_PASS || '' : process.env.SMTP_PASS || '',
  },
  pecFrom: process.env.PEC_FROM || process.env.MAIL_FROM || 'CivicAlerts <segnalazioni@civicalert.local>',
  // Se impostato, TUTTE le PEC vengono dirottate qui invece che ai comuni (utile nei test).
  pecOverrideTo: process.env.PEC_OVERRIDE_TO || '',
  nominatimUrl: process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org',
  nominatimEmail: process.env.NOMINATIM_EMAIL || '',
  publicUrl: process.env.PUBLIC_URL || '',
};
