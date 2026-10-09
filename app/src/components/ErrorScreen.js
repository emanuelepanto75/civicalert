'use client';

import { useEffect } from 'react';

// Schermata mostrata quando l'app si blocca nel browser: messaggio in italiano,
// pulsante per riprovare e invio dei dettagli al server.
export default function ErrorScreen({ error, reset }) {
  useEffect(() => {
    fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: window.location.pathname,
        message: error?.message,
        digest: error?.digest,
        stack: error?.stack,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 420, margin: '15vh auto', padding: 24, textAlign: 'center', color: '#111827' }}>
      <div style={{ fontSize: 44 }}>⚠️</div>
      <h2 style={{ color: '#1A3A6B', margin: '12px 0' }}>Qualcosa non ha funzionato</h2>
      <p style={{ color: '#4b5563', lineHeight: 1.5 }}>
        Abbiamo registrato il problema. Riprova; se si ripete, disattiva la traduzione automatica della pagina
        o apri il sito direttamente in Chrome o Safari.
      </p>
      <button
        onClick={() => (reset ? reset() : window.location.reload())}
        style={{ marginTop: 16, padding: '12px 22px', borderRadius: 12, border: 0, background: '#1A3A6B', color: '#fff', fontSize: 16, fontWeight: 700 }}
      >
        Riprova
      </button>
      <p style={{ marginTop: 14 }}><a href="/" style={{ color: '#1A3A6B' }}>Torna alla mappa</a></p>
    </div>
  );
}
