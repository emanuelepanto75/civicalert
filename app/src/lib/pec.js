import path from 'node:path';
import { config } from './config';
import { escapeHtml, sendPec } from './mailer';

function formatDate(date) {
  return new Date(date).toLocaleString('it-IT', {
    timeZone: 'Europe/Rome',
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

/**
 * Invia la PEC di segnalazione al comune. Il mittente è la casella della
 * piattaforma (una PEC può partire solo da una casella PEC); i dati del
 * cittadino sono nel testo e la sua email è impostata come "Rispondi a".
 */
export async function sendReportPec({ report, recipient, siteUrl }) {
  const { user, category, municipality } = report;
  const mapsUrl = `https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=19/${report.latitude}/${report.longitude}`;
  const detailUrl = `${siteUrl}/segnalazioni/${report.code}`;
  const subject = `[CivicAlerts] Segnalazione ${report.code} – ${category.name} – ${municipality?.name ?? ''}`;

  const rows = [
    ['Codice segnalazione', report.code],
    ['Categoria', `${category.icon} ${category.name}`],
    ['Data e ora', formatDate(report.createdAt)],
    ['Indirizzo stimato', report.address || 'non disponibile'],
    ['Coordinate GPS', `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`],
    ['Descrizione', report.description || '—'],
    ['Segnalante', user ? `${user.firstName} ${user.lastName}` : 'utente rimosso'],
    ['Email segnalante', user?.email || '—'],
    ['Telefono segnalante', user?.phone || '—'],
  ];

  const html = `<!doctype html><html lang="it"><body style="font-family:Arial,sans-serif;color:#111827">
<div style="background:#1A3A6B;color:#fff;padding:20px 24px">
  <h2 style="margin:0">Segnalazione ${escapeHtml(report.code)}</h2>
  <p style="margin:4px 0 0;opacity:.85">Comune di ${escapeHtml(municipality?.name)}</p>
</div>
<div style="padding:24px">
  <p>Si trasmette la seguente segnalazione inviata da un cittadino tramite la piattaforma CivicAlerts.</p>
  <table style="border-collapse:collapse;width:100%">
    ${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8f9fb;font-weight:bold;width:35%">${escapeHtml(k)}</td><td style="padding:8px;border:1px solid #e5e7eb">${escapeHtml(v)}</td></tr>`,
      )
      .join('')}
  </table>
  <p><a href="${mapsUrl}">Apri la posizione sulla mappa</a> · <a href="${detailUrl}">Dettaglio segnalazione</a></p>
  <p style="font-size:12px;color:#6b7280">La foto/video è allegata a questo messaggio.
  Per comunicare la presa in carico o la risoluzione è sufficiente rispondere a questa PEC.</p>
</div></body></html>`;

  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nMappa: ${mapsUrl}\nDettaglio: ${detailUrl}\n`;

  const attachments = report.mediaPath
    ? [{ filename: `${report.code}${path.extname(report.mediaPath)}`, path: path.join(config.uploadDir, report.mediaPath) }]
    : [];

  const info = await sendPec({
    to: config.pecOverrideTo || recipient,
    replyTo: user?.email,
    subject,
    html,
    text,
    attachments,
  });
  return info.messageId;
}
