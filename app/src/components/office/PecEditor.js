'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/components/api';

const FIELDS = [
  { name: 'recipient', label: 'Destinatario', placeholder: 'vuoto = PEC del Comune', type: 'email' },
  { name: 'subject', label: 'Oggetto', placeholder: 'vuoto = oggetto standard' },
  { name: 'address', label: 'Indirizzo (correggi se quello stimato è sbagliato)' },
  { name: 'description', label: 'Descrizione del cittadino (anche sulla mappa pubblica)', rows: 3 },
  { name: 'note', label: 'Nota di CivicAlerts per il Comune (facoltativa)', rows: 3, placeholder: 'es. "Il problema è segnalato da diversi residenti della zona."' },
];

// Amministratore: anteprima della PEC al Comune e modifica prima dell'approvazione.
export default function PecEditor({ code }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/ufficio/reports/${code}/pec`, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Anteprima non disponibile');
    setData(json);
    setForm(json.fields);
  }, [code]);

  useEffect(() => {
    load().catch((err) => setMessage({ ok: false, text: err.message }));
  }, [load]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/ufficio/reports/${code}/pec`, { method: 'PATCH', body: form });
      await load();
      setEditing(false);
      setMessage({ ok: true, text: 'Modifiche salvate: l’anteprima è aggiornata.' });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="panel">
        <h2>PEC al Comune</h2>
        {message ? <div className="alert error">{message.text}</div> : <div className="muted small">Caricamento anteprima…</div>}
      </div>
    );
  }

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <h2 style={{ margin: 0 }}>{data.editable ? 'PEC che verrà inviata al Comune' : 'PEC al Comune'}</h2>
        {data.editable && !editing && (
          <button type="button" className="btn-sm primary" onClick={() => setEditing(true)}>Modifica</button>
        )}
      </div>
      <dl className="facts" style={{ marginTop: 12 }}>
        <dt>A</dt>
        <dd>
          {data.to || <span style={{ color: '#991b1b' }}>nessun destinatario: la segnalazione verrà solo registrata</span>}
          {data.overrideTo && <div className="muted small">Modalità collaudo: in realtà parte verso {data.overrideTo}</div>}
        </dd>
        <dt>Oggetto</dt><dd>{data.subject}</dd>
        <dt>Allegato</dt><dd>{data.attachment || 'nessuno'}</dd>
      </dl>

      {editing && (
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {FIELDS.map((f) => (
            <label key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
              {f.label}
              {f.rows ? (
                <textarea rows={f.rows} value={form[f.name]} placeholder={f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
              ) : (
                <input className="input" type={f.type || 'text'} value={form[f.name]}
                  placeholder={f.name === 'recipient' && data.defaultTo ? `vuoto = ${data.defaultTo}` : f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
              )}
            </label>
          ))}
          <div className="actions-row">
            <button className="btn-sm primary" disabled={busy}>{busy ? 'Salvataggio…' : 'Salva e aggiorna l’anteprima'}</button>
            <button type="button" className="btn-sm" disabled={busy} onClick={() => { setForm(data.fields); setEditing(false); }}>Annulla</button>
          </div>
        </form>
      )}
      {message && <div className={`alert ${message.ok ? 'ok' : 'error'}`} style={{ marginTop: 10 }}>{message.text}</div>}

      {/* I link dell'anteprima (mappa, dettaglio) si aprono in una nuova scheda: molti siti non si lasciano mostrare in un riquadro */}
      <iframe title="Anteprima PEC" srcDoc={data.html.replace('<body', '<base target="_blank"><body')}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        style={{ width: '100%', height: 620, border: '1px solid var(--border)', borderRadius: 10, marginTop: 14, background: '#fff' }} />
    </div>
  );
}
