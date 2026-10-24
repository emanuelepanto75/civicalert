'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/components/api';

// Numero di protocollo del Comune: letto dalle PEC di risposta o inserito a mano.
export default function ProtocolEdit({ code, number, date }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ number: number || '', date: date || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/ufficio/reports/${code}/protocol`, { method: 'PATCH', body: form });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <span>
        {number ? <strong>n. {number}{date ? ` del ${date}` : ''}</strong> : <span className="muted">non ancora comunicato</span>}{' '}
        <button type="button" className="btn-sm" style={{ marginLeft: 6 }} onClick={() => setEditing(true)}>{number ? 'Modifica' : 'Inserisci'}</button>
      </span>
    );
  }
  return (
    <form className="inline-confirm" onSubmit={save}>
      <input className="input" placeholder="numero, es. 12345/2026" value={form.number} autoFocus
        onChange={(e) => setForm({ ...form, number: e.target.value })} style={{ width: 170, padding: '6px 10px' }} />
      <input className="input" placeholder="data, es. 21/10/2026" value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ width: 130, padding: '6px 10px' }} />
      <button className="btn-sm primary" disabled={busy}>Salva</button>
      <button type="button" className="btn-sm" onClick={() => setEditing(false)}>Annulla</button>
      {error && <span style={{ color: '#991b1b' }}>{error}</span>}
    </form>
  );
}
