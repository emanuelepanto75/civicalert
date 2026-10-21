import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { notifyAdmin } from './adminNotify';
import { config } from './config';
import { prisma } from './db';

// Lettura della casella PEC della piattaforma (civicalerts@pec.it): ricevute di
// consegna, mancate consegne e risposte dei Comuni, collegate alla segnalazione
// tramite il codice CA-XXXXXX o il Message-ID della PEC inviata.

const STATE_KEY = 'pec_inbox';
const CODE_RE = /\bCA-[A-HJ-NP-Z2-9]{6}\b/;
const FIRST_RUN_DAYS = 30; // al primo avvio si leggono le PEC degli ultimi 30 giorni
let running = false;

export function pecInboxEnabled() {
  return Boolean(config.pecImap.host && config.pecImap.user);
}

/**
 * Cerca un numero di protocollo nel testo di una risposta. Restituisce
 * { number, date } oppure null. Riconosce le forme più comuni:
 * "Prot. n. 12345", "protocollo n° 12345/2026", "numero di protocollo: 0012345",
 * "protocollata con il numero 12345 del 21/10/2026".
 */
export function extractProtocol(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ');
  const NUM = '([0-9][0-9./-]{0,20}[0-9]|[0-9])';
  const patterns = [
    new RegExp(`numero\\s+(?:di\\s+)?protocollo(?:\\s+generale)?\\s*(?:n\\.?|n°|nº)?\\s*[:.]?\\s*${NUM}`, 'i'),
    new RegExp(`\\bprot(?:ocollo)?\\.?(?:\\s+gen(?:erale)?\\.?)?\\s*(?:n(?:r|um|umero)?\\.?|n°|nº)\\s*[:.]?\\s*${NUM}`, 'i'),
    new RegExp(`protocollat[ao]\\s+(?:al\\s+|con\\s+(?:il\\s+)?)?(?:n(?:umero)?\\.?|n°|nº)\\s*[:.]?\\s*${NUM}`, 'i'),
    new RegExp(`\\bprotocollo\\s*[:]\\s*${NUM}`, 'i'),
  ];
  for (const re of patterns) {
    const m = re.exec(text);
    if (!m) continue;
    const number = m[1].replace(/[./-]+$/, '');
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 40);
    const date = /^\s*(?:del|in data)\s+(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i.exec(after)?.[1] || null;
    return { number, date };
  }
  return null;
}

// Le PEC arrivano "imbustate": il messaggio vero è la parte message/rfc822
// (postacert.eml), che la lettura IMAP scarica a parte e passa come innerSource.
async function unwrap(source, innerSource) {
  const outer = await simpleParser(source);
  if (innerSource) return { outer, inner: await simpleParser(innerSource) };
  const env = outer.attachments?.find((a) => /postacert\.eml$/i.test(a.filename || '') || a.contentType === 'message/rfc822');
  return { outer, inner: env ? await simpleParser(env.content) : null };
}

// Numero della parte message/rfc822 nella struttura del messaggio (IMAP BODYSTRUCTURE)
function rfc822Part(node) {
  if (!node) return null;
  if (node.type === 'message/rfc822') return node.part || null;
  for (const child of node.childNodes || []) {
    const part = rfc822Part(child);
    if (part) return part;
  }
  return null;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function kindOf(subject = '') {
  const s = subject.toUpperCase();
  if (s.startsWith('ACCETTAZIONE:')) return 'ACCETTAZIONE';
  if (s.startsWith('CONSEGNA:')) return 'CONSEGNA';
  if (/MANCATA CONSEGNA|NON ACCETTAZIONE|PREAVVISO DI MANCATA/.test(s)) return 'ERRORE';
  return 'MESSAGGIO';
}

async function findReport({ subject, text, inReplyTo, references }) {
  const code = (subject || '').match(CODE_RE)?.[0] || (text || '').match(CODE_RE)?.[0];
  if (code) {
    const r = await prisma.report.findUnique({ where: { code }, include: { deliveries: true } });
    if (r) return r;
  }
  const ids = [inReplyTo, ...(Array.isArray(references) ? references : [references])].filter(Boolean);
  if (ids.length) {
    const d = await prisma.delivery.findFirst({ where: { messageId: { in: ids } }, include: { report: { include: { deliveries: true } } } });
    if (d) return d.report;
  }
  return null;
}

/** Elabora una PEC (sorgente RFC822). Restituisce cosa è stato fatto, per i log e i test. */
export async function handlePecMessage(source, innerSource = null) {
  const { outer, inner } = await unwrap(source, innerSource);
  const kind = kindOf(outer.subject);
  if (kind === 'ACCETTAZIONE') return { kind };

  const msg = inner || outer;
  const report = await findReport({
    subject: `${outer.subject || ''} ${msg.subject || ''}`,
    text: msg.text,
    inReplyTo: msg.inReplyTo,
    references: msg.references,
  });

  if (kind === 'CONSEGNA' || kind === 'ERRORE') {
    if (!report) return { kind, report: null };
    const delivery = report.deliveries.find((d) => d.status === 'SENT') || report.deliveries[0];
    if (!delivery) return { kind, report: report.code };
    if (kind === 'CONSEGNA') {
      if (!delivery.deliveredAt) {
        await prisma.delivery.update({ where: { id: delivery.id }, data: { deliveredAt: outer.date || new Date() } });
      }
    } else {
      await prisma.delivery.update({ where: { id: delivery.id }, data: { lastError: (outer.subject || 'Mancata consegna').slice(0, 500) } });
      await notifyAdmin(
        `CivicAlerts: PEC non consegnata (${report.code})`,
        `${outer.subject}\n\nControlla l'indirizzo PEC del Comune in Ufficio › Comuni e riprova da Invii PEC.`,
        'pec in arrivo',
      );
    }
    return { kind, report: report.code };
  }

  // Risposta o protocollazione del Comune
  const messageId = msg.messageId || outer.messageId || `${outer.date?.toISOString()}-${outer.subject}`;
  if (await prisma.inboundMessage.findUnique({ where: { messageId } })) return { kind, duplicate: true };
  const from = msg.from?.value?.[0]?.address || outer.from?.value?.[0]?.address || null;
  const text = (msg.text || '').slice(0, 20000);
  const protocol = extractProtocol(`${msg.subject || ''}\n${text}`);

  await prisma.inboundMessage.create({
    data: {
      messageId,
      reportId: report?.id ?? null,
      fromAddress: from,
      subject: msg.subject || outer.subject || null,
      text,
      protocolNumber: protocol?.number ?? null,
      receivedAt: msg.date || outer.date || new Date(),
    },
  });
  if (report && protocol && !report.protocolNumber) {
    await prisma.report.update({
      where: { id: report.id },
      data: { protocolNumber: protocol.number, protocolDate: protocol.date },
    });
  }
  if (report) {
    await prisma.reportEvent.create({
      data: {
        reportId: report.id,
        kind: 'NOTE',
        note: `PEC ricevuta da ${from || 'mittente sconosciuto'}: ${msg.subject || ''}${protocol ? ` — protocollo n. ${protocol.number}${protocol.date ? ` del ${protocol.date}` : ''}` : ''}`,
      },
    });
  }
  await notifyAdmin(
    report
      ? `CivicAlerts: risposta del Comune su ${report.code}${protocol ? ` (prot. ${protocol.number})` : ''}`
      : 'CivicAlerts: PEC ricevuta non collegata a una segnalazione',
    `Da: ${from || '—'}\nOggetto: ${msg.subject || '—'}\n${protocol ? `Protocollo: ${protocol.number}${protocol.date ? ` del ${protocol.date}` : ''}\n` : ''}\n${text.slice(0, 600)}`,
    'pec in arrivo',
  );
  return { kind, report: report?.code ?? null, protocol };
}

async function loadState() {
  const row = await prisma.setting.findUnique({ where: { key: STATE_KEY } });
  return row ? JSON.parse(row.value) : null;
}

async function saveState(state) {
  const value = JSON.stringify(state);
  await prisma.setting.upsert({ where: { key: STATE_KEY }, create: { key: STATE_KEY, value }, update: { value } });
}

/** Legge le PEC nuove (non segna nulla come letto: la casella resta com'è per la webmail). */
export async function checkPecInbox() {
  if (running || !pecInboxEnabled()) return;
  running = true;
  const { host, port, secure, user, pass } = config.pecImap;
  const client = new ImapFlow({ host, port, secure, auth: { user, pass }, logger: false });
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const box = client.mailbox;
      let state = await loadState();
      if (!state || String(state.uidValidity) !== String(box.uidValidity)) {
        const since = new Date(Date.now() - FIRST_RUN_DAYS * 86400000);
        const uids = (await client.search({ since }, { uid: true })) || [];
        state = { uidValidity: String(box.uidValidity), lastUid: uids.length ? Math.min(...uids) - 1 : box.uidNext - 1 };
      }
      // Prima si raccolgono i messaggi, poi si scaricano le buste interne (durante un FETCH non si possono dare altri comandi)
      const messages = [];
      for await (const m of client.fetch(`${state.lastUid + 1}:*`, { uid: true, source: true, bodyStructure: true }, { uid: true })) {
        if (m.uid > state.lastUid) messages.push({ uid: m.uid, source: m.source, part: rfc822Part(m.bodyStructure) });
      }
      for (const m of messages) {
        try {
          const inner = m.part ? await streamToBuffer((await client.download(String(m.uid), m.part, { uid: true })).content) : null;
          const result = await handlePecMessage(m.source, inner);
          if (result.kind !== 'ACCETTAZIONE') console.log(`[pec in arrivo] uid ${m.uid}:`, JSON.stringify(result));
        } catch (err) {
          console.error(`[pec in arrivo] uid ${m.uid} non elaborata:`, err.message);
        }
        state.lastUid = m.uid;
        await saveState(state);
      }
      await saveState(state);
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    console.error('[pec in arrivo]', err.message);
    client.close();
  } finally {
    running = false;
  }
}
