import { escapeHtml, sendMail } from './mailer';

function layout(title, body, link, label) {
  return `<!doctype html><html lang="it"><body style="font-family:Arial,sans-serif;color:#111827">
<div style="max-width:520px;margin:auto;padding:24px">
  <h2 style="color:#1A3A6B">${escapeHtml(title)}</h2>
  <div style="margin:0 0 16px">${body}</div>
  <p><a href="${link}" style="display:inline-block;background:#1A3A6B;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">${escapeHtml(label)}</a></p>
  <p style="font-size:12px;color:#6b7280">Se il pulsante non funziona copia questo indirizzo nel browser:<br>${escapeHtml(link)}</p>
</div></body></html>`;
}

export function sendVerificationEmail(user, siteUrl) {
  const link = `${siteUrl}/api/auth/verify?token=${user.verifyToken}`;
  return sendMail({
    to: user.email,
    subject: 'CivicAlerts – conferma il tuo indirizzo email',
    html: layout(
      `Ciao ${user.firstName}, benvenuto in CivicAlerts!`,
      'Per attivare il tuo account conferma il tuo indirizzo email.',
      link,
      'Conferma email',
    ),
    text: `Conferma il tuo indirizzo email: ${link}`,
  });
}

export function sendResetEmail(user, siteUrl) {
  const link = `${siteUrl}/reimposta-password?token=${user.resetToken}`;
  return sendMail({
    to: user.email,
    subject: 'CivicAlerts – reimposta la password',
    html: layout(
      'Reimposta la password',
      'Hai chiesto di reimpostare la password. Il link vale 1 ora; se non sei stato tu ignora questa email.',
      link,
      'Scegli una nuova password',
    ),
    text: `Reimposta la password: ${link}`,
  });
}

const STATUS_MESSAGES = {
  ACKNOWLEDGED: 'è stata presa in carico dal Comune',
  RESOLVED: 'è stata segnata come risolta dal Comune',
  REJECTED: 'è stata respinta dal Comune',
};

export function sendStatusEmail({ report, toStatus, note, siteUrl }) {
  const link = `${siteUrl}/segnalazioni/${report.code}`;
  const what = STATUS_MESSAGES[toStatus] || 'è stata aggiornata';
  const noteHtml = note
    ? `<p style="background:#f8f9fb;border-left:3px solid #1A3A6B;padding:10px 14px"><b>Messaggio dell’ufficio:</b><br>${escapeHtml(note)}</p>`
    : '';
  return sendMail({
    to: report.user.email,
    subject: `CivicAlerts – la segnalazione ${report.code} ${what}`,
    html: layout(
      `Aggiornamento sulla segnalazione ${report.code}`,
      `Ciao ${escapeHtml(report.user.firstName)}, la tua segnalazione “${escapeHtml(report.category.name)}” ${what}.${noteHtml}`,
      link,
      'Vedi la segnalazione',
    ),
    text: `La tua segnalazione ${report.code} ${what}.${note ? `\n\nMessaggio dell'ufficio: ${note}` : ''}\n\n${link}`,
  });
}

const fmtDate = (d) => new Date(d).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'long', timeStyle: 'short' });

function detailsTable(rows) {
  return `<table style="border-collapse:collapse;width:100%;font-size:14px;margin:12px 0">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;background:#f8f9fb;font-weight:bold;width:38%">${escapeHtml(k)}</td><td style="padding:6px 8px;border:1px solid #e5e7eb">${escapeHtml(v)}</td></tr>`,
    )
    .join('')}</table>`;
}

/**
 * Ricevuta al cittadino dopo l'invio. `pec` = esito dell'invio al Comune:
 * 'SENT' | 'PENDING' | null (Comune senza PEC); `sameProblem` = quante
 * segnalazioni dello stesso problema esistono, compresa questa.
 */
export function sendReceiptEmail({ report, pec, sameProblem = 1, siteUrl }) {
  const link = `${siteUrl}/segnalazioni/${report.code}`;
  const comune = report.municipality?.name;
  const pecLine = {
    SENT: `La segnalazione è stata inviata via PEC al Comune di ${comune}.`,
    PENDING: `La segnalazione verrà inviata via PEC al Comune di ${comune} nei prossimi minuti.`,
  }[pec] || 'Non è stato possibile individuare un indirizzo PEC per questa zona: la segnalazione è registrata ma non è stata inviata a un Comune.';
  const repeatLine =
    sameProblem > 1
      ? `<p>Lo stesso problema era già stato segnalato da altri cittadini: con la tua le segnalazioni sono <b>${sameProblem}</b>. Il Comune riceve anche questa, così sa che non è un caso isolato.</p>`
      : '';
  const rows = [
    ['Numero', report.code],
    ['Categoria', report.category.name],
    ['Data', fmtDate(report.createdAt)],
    ['Posizione', report.address || `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`],
    ['Comune', comune || '—'],
  ];
  return sendMail({
    to: report.user.email,
    subject: `CivicAlerts – ricevuta della segnalazione ${report.code}`,
    html: layout(
      `Segnalazione ${report.code} registrata`,
      `Ciao ${escapeHtml(report.user.firstName)}, grazie per la segnalazione. ${escapeHtml(pecLine)}${detailsTable(rows)}${repeatLine}<p>Conserva il numero ${escapeHtml(report.code)}: ti avviseremo via email quando cambia lo stato.</p>`,
      link,
      'Segui la segnalazione',
    ),
    text: `Segnalazione ${report.code} registrata. ${pecLine}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}${sameProblem > 1 ? `\n\nSegnalazioni dello stesso problema, compresa la tua: ${sameProblem}.` : ''}\n\n${link}`,
  });
}

// Promemoria per i Comuni senza cruscotto: il cittadino conferma se il problema è risolto.
export function sendReminderEmail({ report, days, siteUrl }) {
  const link = `${siteUrl}/segnalazioni/${report.code}`;
  return sendMail({
    to: report.user.email,
    subject: `CivicAlerts – il problema ${report.code} è stato risolto?`,
    html: layout(
      'Il problema è stato risolto?',
      `Ciao ${escapeHtml(report.user.firstName)}, ${days} giorni fa hai segnalato “${escapeHtml(report.category.name)}” in ${escapeHtml(report.address || 'una zona')} (${escapeHtml(report.code)}).<p>Se il problema è stato sistemato, aprila e premi <b>“Segna come risolta”</b>: ci aiuti a sapere quanto il Comune risponde alle segnalazioni. Se non è ancora risolto non devi fare nulla.</p>`,
      link,
      'Apri la segnalazione',
    ),
    text: `${days} giorni fa hai segnalato "${report.category.name}" (${report.code}). Se il problema è stato risolto, apri la segnalazione e premi "Segna come risolta": ${link}`,
  });
}
