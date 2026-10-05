import nodemailer from 'nodemailer';
import { config } from './config';

let transporter;

// In locale punta a Mailpit (nessuna email esce davvero dal server).
// In produzione basta impostare SMTP_HOST/PORT/USER/PASS della casella PEC.
export function getTransporter() {
  if (!transporter) {
    const { host, port, user, pass } = config.smtp;
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
  }
  return transporter;
}

export function sendMail(message) {
  return getTransporter().sendMail({ from: config.mailFrom, ...message });
}

export function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}
