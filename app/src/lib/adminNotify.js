import { config } from './config';
import { prisma } from './db';
import { sendMail } from './mailer';

/**
 * Avviso all'amministratore: email ad ALERT_EMAIL (se manca, agli account
 * amministratore) e, se configurato, WhatsApp tramite CallMeBot.
 * Non lancia mai: un avviso non riuscito finisce solo nei log.
 */
export async function notifyAdmin(subject, text, tag = 'avviso') {
  const { email, whatsapp } = config.ipWatch;
  const to = email
    ? [email]
    : (await prisma.user.findMany({ where: { role: 'ADMIN', isBanned: false }, select: { email: true } })).map((u) => u.email);
  for (const address of to) {
    await sendMail({ to: address, subject, text }).catch((err) =>
      console.error(`[${tag}] email non inviata:`, err.message),
    );
  }
  if (whatsapp.phone && whatsapp.apiKey) {
    const url = new URL('https://api.callmebot.com/whatsapp.php');
    url.searchParams.set('phone', whatsapp.phone);
    url.searchParams.set('apikey', whatsapp.apiKey);
    url.searchParams.set('text', `${subject}\n\n${text}`);
    await fetch(url, { signal: AbortSignal.timeout(20_000) })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      })
      .catch((err) => console.error(`[${tag}] WhatsApp non inviato:`, err.message));
  }
}
