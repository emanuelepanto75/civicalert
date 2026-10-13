import path from 'node:path';
import { config } from './config';
import { escapeHtml, sendPec } from './mailer';

// Indirizzo della casella PEC della piattaforma, es. "CivicAlerts <civicalerts@pec.it>" → civicalerts@pec.it
function platformAddress() {
  return config.pecFrom.match(/<([^>]+)>/)?.[1] || config.pecFrom;
}

// Nota in fondo a ogni PEC: perché il Comune la riceve e come indicarci canali più adatti.
// Si risponde alla casella della piattaforma, non con "Rispondi" (che va al cittadino).
function channelsNote() {
  const to = platformAddress();
  return {
    title: 'Perché ricevete questa PEC',
    paragraphs: [
      'CivicAlerts è un servizio gratuito con cui i cittadini segnalano problemi del territorio (buche, illuminazione, rifiuti, segnaletica…) con foto e posizione GPS. Ogni segnalazione viene inviata via PEC al Comune competente per la zona, a questo indirizzo.',
      'Se preferite ricevere le segnalazioni su un indirizzo diverso (per esempio l’ufficio tecnico o la polizia municipale), se avete un numero WhatsApp o un altro canale dedicato, oppure se per alcuni tipi di problema esiste un gestore specifico (per esempio la ditta che cura l’illuminazione pubblica o la raccolta dei rifiuti), vi chiediamo di comunicarcelo:',
      `scrivete a ${to} indicando il Comune, il tipo di problema e il recapito. Aggiorneremo i nostri dati e le prossime segnalazioni arriveranno direttamente al destinatario giusto.`,
      'Attenzione: con “Rispondi” la risposta va al cittadino che ha fatto la segnalazione.',
    ],
  };
}

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
export async function sendReportPec({ report, recipient, siteUrl, repeat = null }) {
  const { user, category, municipality } = report;
  const mapsUrl = `https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=19/${report.latitude}/${report.longitude}`;
  const detailUrl = `${siteUrl}/segnalazioni/${report.code}`;
  const subject = `[CivicAlerts] Segnalazione ${report.code}${repeat ? ` (${repeat.number}ª dello stesso problema)` : ''} – ${category.name} – ${municipality?.name ?? ''}`;
  const repeatText = repeat
    ? `Lo stesso problema è stato segnalato da ${repeat.number} cittadini diversi: questa è la segnalazione n. ${repeat.number}. Prima segnalazione: ${repeat.firstCode}, ${formatDate(repeat.firstDate)}.`
    : '';

  const rows = [
    ['Codice segnalazione', report.code],
    ['Categoria', `${category.icon} ${category.name}`],
    ['Data e ora', formatDate(report.createdAt)],
    ['Indirizzo stimato', report.address || 'non disponibile'],
    ['Coordinate GPS', `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`],
    ['Descrizione', report.description || '—'],
    ...(repeat ? [['Segnalazioni dello stesso problema', `${repeat.number} (prima: ${repeat.firstCode}, ${formatDate(repeat.firstDate)})`]] : []),
    ['Segnalante', user ? `${user.firstName} ${user.lastName}` : 'utente rimosso'],
    ['Email segnalante', user?.email || '—'],
    ['Telefono segnalante', user?.phone || '—'],
  ];

  const note = channelsNote();
  const html = `<!doctype html><html lang="it"><body style="font-family:Arial,sans-serif;color:#111827">
<div style="background:#1A3A6B;color:#fff;padding:20px 24px">
  <h2 style="margin:0">Segnalazione ${escapeHtml(report.code)}</h2>
  <p style="margin:4px 0 0;opacity:.85">Comune di ${escapeHtml(municipality?.name)}</p>
</div>
<div style="padding:24px">
  <p>Si trasmette la seguente segnalazione inviata da un cittadino tramite la piattaforma CivicAlerts.</p>
  ${repeatText ? `<p style="background:#fff7ed;border-left:4px solid #E85D04;padding:10px 14px"><b>${escapeHtml(repeatText)}</b></p>` : ''}
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
  Per comunicare la presa in carico o la risoluzione al cittadino è sufficiente rispondere a questa PEC.</p>
  <div style="margin-top:20px;background:#f8f9fb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;font-size:13px;color:#374151">
    <p style="margin:0 0 8px;font-weight:bold;color:#1A3A6B">${escapeHtml(note.title)}</p>
    ${note.paragraphs.map((p) => `<p style="margin:0 0 8px">${escapeHtml(p)}</p>`).join('')}
  </div>
</div></body></html>`;

  const text = (repeatText ? `${repeatText}\n\n` : '') + rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nMappa: ${mapsUrl}\nDettaglio: ${detailUrl}\n` + `\n---\n${note.title.toUpperCase()}\n\n${note.paragraphs.join('\n\n')}\n`;

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
