'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/components/api';

const ACTIONS = [
  { status: 'ACKNOWLEDGED', label: 'Prendi in carico', cls: 'primary', hint: 'L’ufficio ha preso in carico la segnalazione.' },
  { status: 'RESOLVED', label: 'Segna come risolta', cls: 'green', hint: 'Il problema è stato risolto.' },
  { status: 'REJECTED', label: 'Respingi', cls: 'danger', hint: 'Indica il motivo (obbligatorio).' },
];

// Cambio di stato con messaggio facoltativo al cittadino.
export default function StatusPanel({ code, status, hasCitizen }) {
  const router = useRouter();
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const closed = status === 'RESOLVED' || status === 'REJECTED';
  const actions = closed
    ? [{ status: 'ACKNOWLEDGED', label: 'Riapri', cls: '', hint: 'La segnalazione torna in lavorazione.' }]
    : ACTIONS.filter((a) => a.status !== status);
  const action = actions.find((a) => a.status === selected);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api(`/api/ufficio/reports/${code}/status`, { body: { status: selected, note, notify: hasCitizen && notify } });
      setSelected(null);
      setNote('');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel">
      <h2>Gestione</h2>
      <div className="actions-row">
        {actions.map((a) => (
          <button key={a.status} type="button" className={`btn-sm ${a.cls}`} onClick={() => setSelected(a.status)}
            style={selected === a.status ? { outline: '3px solid #93c5fd' } : undefined}>
            {a.label}
          </button>
        ))}
      </div>
      {action && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <div className="muted small">{action.hint}</div>
          <textarea rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={hasCitizen && notify ? 'Messaggio per il cittadino (facoltativo), es. “Intervento programmato per lunedì”' : 'Nota (facoltativa)'} />
          {hasCitizen && (
            <label className="check" style={{ fontSize: 14 }}>
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              <span>Avvisa il cittadino via email</span>
            </label>
          )}
          {error && <div className="alert error">{error}</div>}
          <div className="actions-row">
            <button type="button" className="btn-sm primary" onClick={save} disabled={saving}>{saving ? 'Salvataggio…' : 'Conferma'}</button>
            <button type="button" className="btn-sm" onClick={() => setSelected(null)}>Annulla</button>
          </div>
        </div>
      )}
    </div>
  );
}
