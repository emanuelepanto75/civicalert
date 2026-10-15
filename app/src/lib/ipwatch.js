import { Resolver } from 'node:dns/promises';
import { config } from './config';
import { sendMail } from './mailer';

// Server di casa con IP dinamico: controlla periodicamente che il DNS del dominio
// punti ancora all'indirizzo internet attuale e, se no, avvisa l'amministratore
// via email e (se configurato) WhatsApp tramite CallMeBot.

const IP_SERVICES = ['https://api.ipify.org', 'https://ifconfig.me/ip', 'https://icanhazip.com'];
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

// Ultimo stato noto: si avvisa solo quando cambia, non a ogni controllo.
let last = { mismatch: false, publicIp: null };

export function ipWatchEnabled() {
  const { minutes, hosts, email, whatsapp } = config.ipWatch;
  return minutes > 0 && hosts.length > 0 && Boolean(email || (whatsapp.phone && whatsapp.apiKey));
}

async function publicIp() {
  for (const url of IP_SERVICES) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      const ip = (await res.text()).trim();
      if (res.ok && IPV4.test(ip)) return ip;
    } catch {
      // si prova il servizio successivo
    }
  }
  throw new Error('indirizzo pubblico non disponibile');
}

// DNS pubblici, non quello del router: mostrano ciò che vede il resto di internet.
async function dnsIps(host) {
  const resolver = new Resolver({ timeout: 5_000, tries: 2 });
  resolver.setServers(['1.1.1.1', '8.8.8.8']);
  try {
    return await resolver.resolve4(host);
  } catch (err) {
    return [`errore (${err.code || err.message})`];
  }
}

async function notify(subject, text) {
  const { email, whatsapp } = config.ipWatch;
  if (email) {
    await sendMail({ to: email, subject, text }).catch((err) =>
      console.error('[controllo ip] email non inviata:', err.message),
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
      .catch((err) => console.error('[controllo ip] WhatsApp non inviato:', err.message));
  }
}

export async function checkPublicIp() {
  const ip = await publicIp();
  const wrong = [];
  for (const host of config.ipWatch.hosts) {
    const ips = await dnsIps(host);
    if (!ips.includes(ip)) wrong.push(`${host} → ${ips.join(', ')}`);
  }

  if (wrong.length > 0 && (!last.mismatch || last.publicIp !== ip)) {
    console.warn(`[controllo ip] indirizzo attuale ${ip}, DNS non aggiornato: ${wrong.join('; ')}`);
    await notify(
      'CivicAlerts: indirizzo internet cambiato',
      `L'indirizzo internet del server è ora ${ip}, ma il DNS punta ancora altrove:\n` +
        `${wrong.join('\n')}\n\n` +
        `Sito e app non sono raggiungibili da fuori finché non aggiorni i record A su Aruba ` +
        `(Gestione DNS: "@" e "app") con ${ip}.`,
    );
  } else if (wrong.length === 0 && last.mismatch) {
    console.log(`[controllo ip] DNS di nuovo corretto (${ip})`);
    await notify(
      'CivicAlerts: DNS di nuovo corretto',
      `Il DNS punta di nuovo all'indirizzo del server (${ip}): sito e app sono raggiungibili.`,
    );
  }
  last = { mismatch: wrong.length > 0, publicIp: ip };
}
