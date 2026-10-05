import { escapeHtml, sendMail } from './mailer';

function layout(title, body, link, label) {
  return `<!doctype html><html lang="it"><body style="font-family:Arial,sans-serif;color:#111827">
<div style="max-width:520px;margin:auto;padding:24px">
  <h2 style="color:#1A3A6B">${escapeHtml(title)}</h2>
  <p>${body}</p>
  <p><a href="${link}" style="display:inline-block;background:#1A3A6B;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">${escapeHtml(label)}</a></p>
  <p style="font-size:12px;color:#6b7280">Se il pulsante non funziona copia questo indirizzo nel browser:<br>${escapeHtml(link)}</p>
</div></body></html>`;
}

export function sendVerificationEmail(user, siteUrl) {
  const link = `${siteUrl}/api/auth/verify?token=${user.verifyToken}`;
  return sendMail({
    to: user.email,
    subject: 'CivicAlert – conferma il tuo indirizzo email',
    html: layout(
      `Ciao ${user.firstName}, benvenuto in CivicAlert!`,
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
    subject: 'CivicAlert – reimposta la password',
    html: layout(
      'Reimposta la password',
      'Hai chiesto di reimpostare la password. Il link vale 1 ora; se non sei stato tu ignora questa email.',
      link,
      'Scegli una nuova password',
    ),
    text: `Reimposta la password: ${link}`,
  });
}
