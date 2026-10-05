// Avviato una volta all'avvio del server: riprova periodicamente gli invii PEC
// rimasti in sospeso (anche quelli interrotti da un riavvio).
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { processPendingDeliveries } = await import('./lib/deliveries');
  setInterval(() => {
    processPendingDeliveries().catch((err) => console.error('[pec worker]', err));
  }, 60_000).unref();
}
