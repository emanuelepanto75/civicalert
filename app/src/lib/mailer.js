import nodemailer from 'nodemailer';
import { config } from './config';

const transporters = new Map();

function transporter({ host, port, user, pass }) {
  const key = `${host}:${port}:${user}`;
  if (!transporters.has(key)) {
    transporters.set(
      key,
      nodemailer.createTransport({ host, port, secure: port === 465, auth: user ? { user, pass } : undefined }),
    );
  }
  return transporters.get(key);
}

// Email ai cittadini (conferme, avvisi): casella normale del dominio.
// In locale punta a Mailpit, quindi nessuna email esce davvero dal server.
export function sendMail(message) {
  return transporter(config.smtp).sendMail({ from: config.mailFrom, ...message });
}

// Segnalazioni ai Comuni: casella PEC della piattaforma.
export function sendPec(message) {
  return transporter(config.pecSmtp).sendMail({ from: config.pecFrom, ...message });
}

export function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}
