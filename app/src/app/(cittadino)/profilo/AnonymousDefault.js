'use client';

import { useState } from 'react';
import { api } from '@/components/api';

// Scelta predefinita per le nuove segnalazioni; resta modificabile in ogni segnalazione.
export default function AnonymousDefault({ initial }) {
  const [anonymous, setAnonymous] = useState(Boolean(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function change(e) {
    const value = e.target.checked;
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/account', { method: 'PATCH', body: { anonymousDefault: value } });
      setAnonymous(value);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label className="check" style={{ margin: 0 }}>
          <input type="checkbox" checked={anonymous} disabled={busy} onChange={change} />
          <span><b>Segnala in forma anonima</b> come scelta predefinita</span>
        </label>
        <p className="muted small" style={{ margin: 0 }}>
          Con l’anonimato il Comune non riceve nome, email e telefono: le risposte arrivano a CivicAlerts, che te le
          inoltra. Puoi sempre cambiare scelta nella singola segnalazione.
        </p>
        {error && <div className="alert error">{error}</div>}
      </div>
    </div>
  );
}
