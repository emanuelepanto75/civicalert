'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/components/api';

// Amministratore: toglie dalla mappa pubblica (opposizione, dati di terzi) o elimina una segnalazione.
export default function DeleteReport({ code, sent, hidden }) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);

  async function toggleHidden() {
    setToggling(true);
    setError(null);
    try {
      await api(`/api/ufficio/reports/${code}`, { method: 'PATCH', body: { hidden: !hidden } });
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(false);
    }
  }
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
      <h2>Pubblicazione ed eliminazione</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        {hidden
          ? 'Non compare sulla mappa e nell’elenco pubblici (resta inviata al Comune).'
          : 'Compare sulla mappa e nell’elenco pubblici, senza dati del segnalante.'}
      </p>
      {!confirming ? (
        <div className="actions-row">
          <button type="button" className="btn-sm" onClick={toggleHidden} disabled={toggling}>
            {toggling ? 'Salvataggio…' : hidden ? 'Rimetti sulla mappa' : 'Togli dalla mappa pubblica'}
          </button>
          <button type="button" className="btn-sm danger" onClick={() => setConfirming(true)}>Elimina segnalazione</button>
        </div>
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
