const nodemailer = require('nodemailer');
const path       = require('path');
const fs         = require('fs');

/**
 * Crea il trasporter SMTP per la casella PEC.
 * Le credenziali vengono lette dalle variabili d'ambiente.
 */
function creaTransporter() {
  return nodemailer.createTransport({
    host  : process.env.PEC_HOST,
    port  : parseInt(process.env.PEC_PORT || '465'),
    secure: parseInt(process.env.PEC_PORT || '465') === 465,
    auth  : {
      user: process.env.PEC_USER,
      pass: process.env.PEC_PASS,
    },
    tls: {
      rejectUnauthorized: false, // necessario per alcuni provider PEC
    },
  });
}

/**
 * Invia la segnalazione via PEC al comune competente.
 *
 * @param {Object} params
 * @param {string} params.destinatario   - Indirizzo PEC del comune
 * @param {Object} params.report         - Dati della segnalazione
 * @param {Object} params.utente         - Dati dell'utente segnalante
 * @param {string} params.mediaPath      - Percorso assoluto del file media (opzionale)
 * @returns {Promise<{messageId: string}>}
 */
async function inviaPEC({ destinatario, report, utente, mediaPath }) {
  const transporter = creaTransporter();

  // ── Corpo email ─────────────────────────────────────────────────────────────
  const dataFormattata = new Date(report.createdAt).toLocaleString('it-IT', {
    day  : '2-digit', month: 'long', year: 'numeric',
    hour : '2-digit', minute: '2-digit',
  });

  const oggettoEmail =
    `[CivicAlert] Segnalazione #${report.id.slice(0, 8).toUpperCase()} – ${report.category?.name || 'Problema urbano'} – ${report.addressResolved || 'Posizione GPS'}`;

  const corpoHTML = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <style>
    body        { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 0; }
    .header     { background: #1A3A6B; color: white; padding: 24px 32px; }
    .header h1  { margin: 0; font-size: 22px; }
    .header p   { margin: 4px 0 0; font-size: 13px; opacity: 0.8; }
    .content    { padding: 32px; }
    .badge      { display: inline-block; background: #E85D04; color: white;
                  padding: 4px 12px; border-radius: 20px; font-size: 12px;
                  font-weight: bold; margin-bottom: 20px; }
    table       { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th          { background: #EEF4FB; color: #1A3A6B; text-align: left;
                  padding: 10px 14px; font-size: 13px; border: 1px solid #e5e7eb; }
    td          { padding: 10px 14px; font-size: 13px; border: 1px solid #e5e7eb;
                  vertical-align: top; }
    .maps-link  { color: #1A3A6B; font-weight: bold; }
    .footer     { background: #f9fafb; border-top: 1px solid #e5e7eb;
                  padding: 16px 32px; font-size: 11px; color: #6b7280; }
    .id-box     { background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px;
                  padding: 12px 16px; font-family: monospace; font-size: 14px;
                  font-weight: bold; color: #1A3A6B; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔔 CivicAlert — Segnalazione Civica</h1>
    <p>Notifica automatica certificata</p>
  </div>
  <div class="content">
    <div class="badge">${report.category?.name || 'Segnalazione generica'}</div>

    <p>Gentile Ufficio Tecnico del Comune,</p>
    <p>
      si comunica che in data <strong>${dataFormattata}</strong> è stata registrata
      sulla piattaforma <strong>CivicAlert</strong> la seguente segnalazione:
    </p>

    <div class="id-box">ID Segnalazione: #${report.id.slice(0, 8).toUpperCase()}</div>

    <table>
      <tr><th>Categoria</th><td>${report.category?.name || '—'}</td></tr>
      <tr><th>Indirizzo</th><td>${report.addressResolved || '—'}</td></tr>
      <tr><th>Coordinate GPS</th>
          <td>
            ${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}<br>
            <a class="maps-link"
               href="https://maps.google.com/?q=${report.latitude},${report.longitude}">
              Visualizza su Google Maps
            </a>
          </td>
      </tr>
      <tr><th>Descrizione</th><td>${report.description || '(nessuna descrizione aggiuntiva)'}</td></tr>
      <tr><th>Data segnalazione</th><td>${dataFormattata}</td></tr>
    </table>

    ${mediaPath ? '<p><strong>📎 Allegato:</strong> file fotografico o video della segnalazione.</p>' : ''}

    <p style="margin-top: 24px;">
      La presente comunicazione è inviata automaticamente dalla piattaforma CivicAlert
      per conto del cittadino segnalante. La segnalazione è stata registrata nel sistema
      con il numero identificativo sopra indicato, che può essere usato come riferimento
      per eventuali comunicazioni di risposta.
    </p>
  </div>
  <div class="footer">
    CivicAlert — Piattaforma di segnalazione civica certificata |
    Messaggio inviato automaticamente — non rispondere a questo indirizzo
  </div>
</body>
</html>`;

  // ── Allegati ──────────────────────────────────────────────────────────────
  const allegati = [];
  if (mediaPath && fs.existsSync(mediaPath)) {
    allegati.push({
      filename: path.basename(mediaPath),
      path    : mediaPath,
    });
  }

  // ── Invio ──────────────────────────────────────────────────────────────────
  const info = await transporter.sendMail({
    from   : `"CivicAlert Segnalazioni" <${process.env.PEC_FROM}>`,
    to     : destinatario,
    subject: oggettoEmail,
    html   : corpoHTML,
    text   : `Segnalazione #${report.id.slice(0, 8).toUpperCase()} – ${report.category?.name} – ${report.addressResolved} – Coordinate: ${report.latitude}, ${report.longitude}`,
    attachments: allegati,
  });

  console.log(`[PEC] Inviata a ${destinatario} – MessageId: ${info.messageId}`);
  return { messageId: info.messageId };
}

/**
 * Verifica che le credenziali PEC siano configurate.
 */
function pecConfigurata() {
  return !!(
    process.env.PEC_HOST &&
    process.env.PEC_USER &&
    process.env.PEC_PASS &&
    process.env.PEC_FROM
  );
}

module.exports = { inviaPEC, pecConfigurata };
