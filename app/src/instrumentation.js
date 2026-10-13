// Avviato una volta all'avvio del server: riprova periodicamente gli invii PEC
// rimasti in sospeso (anche quelli interrotti da un riavvio) e invia i promemoria.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { processPendingDeliveries } = await import('./lib/deliveries');
  setInterval(() => {
    processPendingDeliveries().catch((err) => console.error('[pec worker]', err));
  }, 60_000).unref();
  // Promemoria "il problema è stato risolto?" ai cittadini (una volta l'ora)
  const { processReminders } = await import('./lib/reminders');
  const remind = () => processReminders().catch((err) => console.error('[promemoria]', err));
  setTimeout(remind, 120_000).unref(); // primo giro poco dopo l'avvio
  setInterval(remind, 3_600_000).unref();
  // Cancellazione dei dati scaduti secondo l'informativa privacy (una volta al giorno)
  const { processRetention } = await import('./lib/retention');
  const retain = () => processRetention().catch((err) => console.error('[conservazione]', err));
  setTimeout(retain, 300_000).unref();
  setInterval(retain, 86_400_000).unref();
  // Server di casa: avviso se l'indirizzo internet cambia e il DNS non è aggiornato
  const { ipWatchEnabled, checkPublicIp } = await import('./lib/ipwatch');
  if (ipWatchEnabled()) {
    const { config } = await import('./lib/config');
    const check = () => checkPublicIp().catch((err) => console.error('[controllo ip]', err.message));
    setTimeout(check, 30_000).unref();
    setInterval(check, config.ipWatch.minutes * 60_000).unref();
  }
}
