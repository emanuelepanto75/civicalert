'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/components/api';

// Modifica in linea della PEC di un Comune (solo amministratore).
export default function MunicipalityEdit({ id, pecAddress, notifyPec }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pec, setPec] = useState(pecAddress || '');
  const [notify, setNotify] = useState(notifyPec);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await api(`/api/ufficio/municipalities/${id}`, { method: 'PATCH', body: { pecAddress: pec, notifyPec: notify } });
      setEditing(false);
      setMessage(res.moved ? `Salvato. ${res.moved === 1 ? '1 invio da ritentare ora va' : `${res.moved} invii da ritentare ora vanno`} al nuovo indirizzo.` : 'Salvato.');
      router.refresh();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="actions-row" style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
        {message && <span className="muted">{message}</span>}
        <button className="btn-sm" onClick={() => { setPec(pecAddress || ''); setNotify(notifyPec); setEditing(true); }}>Modifica</button>
      </div>
    );
  }
  return (
    <form className="inline-confirm" onSubmit={save} style={{ justifyContent: 'flex-end' }}>
      <input className="input" type="email" placeholder="protocollo@pec.comune.it" value={pec}
        onChange={(e) => setPec(e.target.value)} style={{ width: 280, padding: '6px 10px' }} autoFocus />
      <label><input type="checkbox" checked={notify && Boolean(pec)} disabled={!pec} onChange={(e) => setNotify(e.target.checked)} /> invia le segnalazioni</label>
      <button className="btn-sm primary" disabled={busy}>Salva</button>
      <button type="button" className="btn-sm" onClick={() => setEditing(false)}>Annulla</button>
      {message && <span className="muted">{message}</span>}
    </form>
  );
}
