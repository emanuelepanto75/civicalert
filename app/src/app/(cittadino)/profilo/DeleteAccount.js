'use client';

import { useState } from 'react';
import { api } from '@/components/api';

export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function remove(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/account', { method: 'DELETE', body: { password } });
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!open) {
    return <button type="button" className="btn secondary" onClick={() => setOpen(true)}>Elimina il mio account</button>;
  }
  return (
    <form className="card" onSubmit={remove}>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <strong>Eliminare l’account?</strong>
        <p className="muted small">
          Nome, email, telefono e password vengono cancellati subito. Le segnalazioni già inviate restano visibili
          senza alcun dato che ti identifichi; le PEC già arrivate ai Comuni restano nei loro archivi.
        </p>
        {error && <div className="alert error">{error}</div>}
        <div className="field">
          <label htmlFor="del-pass">Conferma con la tua password</label>
          <input id="del-pass" className="input" type="password" required value={password}
            autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="row">
          <button type="button" className="btn secondary" onClick={() => setOpen(false)}>Annulla</button>
          <button className="btn" style={{ background: '#b91c1c' }} disabled={busy}>Elimina</button>
        </div>
      </div>
    </form>
  );
}
