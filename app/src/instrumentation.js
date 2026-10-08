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
}
