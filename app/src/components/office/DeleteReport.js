'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/components/api';

// Amministratore: eliminazione definitiva di una segnalazione (es. prove o abusi).
export default function DeleteReport({ code, sent }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/ufficio/reports/${code}`, { method: 'DELETE' });
      router.push('/ufficio');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h2>Elimina</h2>
      {!confirming ? (
        <button type="button" className="btn-sm danger" onClick={() => setConfirming(true)}>Elimina segnalazione</button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="alert warn small">
            La segnalazione {code} verrà cancellata definitivamente, con foto e storico.
            {sent && ' La PEC già inviata al Comune non si può ritirare.'}
          </div>
          <div className="actions-row">
            <button type="button" className="btn-sm danger" onClick={remove} disabled={busy}>{busy ? 'Eliminazione…' : 'Conferma eliminazione'}</button>
            <button type="button" className="btn-sm" onClick={() => setConfirming(false)} disabled={busy}>Annulla</button>
          </div>
        </div>
      )}
      {error && <div className="alert error" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
