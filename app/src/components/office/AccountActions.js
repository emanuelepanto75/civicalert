'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/components/api';

// Azioni dell'amministratore su un account: blocco, nuova password, eliminazione.
export default function AccountActions({ id, email, active, reports = 0, allowPassword = false }) {
  const router = useRouter();
  const [mode, setMode] = useState(null); // null | 'password' | 'delete'
  const [password, setPassword] = useState('');
  const [withReports, setWithReports] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function run(call, done) {
    setBusy(true);
    setMessage(null);
    try {
      await call();
      setMode(null);
      if (done) setMessage(done);
      router.refresh();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  const url = `/api/ufficio/accounts/${id}`;
  const toggle = () => run(() => api(url, { method: 'PATCH', body: { active: !active } }));
  const savePassword = (e) => {
    e.preventDefault();
    run(() => api(url, { method: 'PATCH', body: { password } }), `Nuova password impostata per ${email}`).then(() => setPassword(''));
  };
  const remove = () => run(() => api(`${url}${withReports ? '?segnalazioni=1' : ''}`, { method: 'DELETE' }));

  if (mode === 'password') {
    return (
      <form className="inline-confirm" onSubmit={savePassword}>
        <input className="input" type="text" minLength={8} required placeholder="Nuova password (min. 8)"
          value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: 190, padding: '6px 10px' }} autoFocus />
        <button className="btn-sm primary" disabled={busy}>Salva</button>
        <button type="button" className="btn-sm" onClick={() => setMode(null)}>Annulla</button>
        {message && <span className="muted">{message}</span>}
      </form>
    );
  }

  if (mode === 'delete') {
    return (
      <div className="inline-confirm">
        <span>Eliminare <strong>{email}</strong>?</span>
        {reports > 0 && (
          <label>
            <input type="checkbox" checked={withReports} onChange={(e) => setWithReports(e.target.checked)} />
            anche le sue {reports} segnalazion{reports === 1 ? 'e' : 'i'} e le foto
          </label>
        )}
        <button className="btn-sm danger" onClick={remove} disabled={busy}>Elimina definitivamente</button>
        <button className="btn-sm" onClick={() => setMode(null)}>Annulla</button>
        {message && <span className="muted">{message}</span>}
      </div>
    );
  }

  return (
    <div className="actions-row" style={{ justifyContent: 'flex-end' }}>
      {message && <span className="muted">{message}</span>}
      <button className={`btn-sm ${active ? '' : 'green'}`} onClick={toggle} disabled={busy}>
        {active ? 'Blocca' : 'Sblocca'}
      </button>
      {allowPassword && <button className="btn-sm" onClick={() => setMode('password')}>Nuova password</button>}
      <button className="btn-sm danger" onClick={() => { setWithReports(false); setMode('delete'); }}>Elimina</button>
    </div>
  );
}
