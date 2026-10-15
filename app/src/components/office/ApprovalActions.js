'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/components/api';

// Approva (parte la PEC) o non approva (con motivo per il cittadino).
export default function ApprovalActions({ code, hasPec }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function send(action) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await api(`/api/ufficio/reports/${code}/approval`, { body: { action, note: action === 'reject' ? note : undefined } });
      setMessage({
        ok: true,
        text: action === 'reject'
          ? 'Non approvata: il cittadino è stato avvisato.'
          : res.pec === 'SENT' ? 'Approvata: PEC inviata al Comune.' : res.pec ? 'Approvata: PEC in invio.' : 'Approvata (Comune senza PEC: resta registrata).',
      });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!rejecting ? (
        <div className="actions-row">
          <button type="button" className="btn-sm green" onClick={() => send('approve')} disabled={busy}>
            {busy ? 'Invio…' : hasPec ? '✓ Approva e invia la PEC' : '✓ Approva'}
          </button>
          <button type="button" className="btn-sm danger" onClick={() => setRejecting(true)} disabled={busy}>✕ Non approvare</button>
        </div>
      ) : (
        <>
          <textarea rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} autoFocus
            placeholder="Motivo, inviato al cittadino (es. “La foto non mostra il problema”, “Segnalazione fuori dalle competenze del Comune”)" />
          <div className="actions-row">
            <button type="button" className="btn-sm danger" onClick={() => send('reject')} disabled={busy || !note.trim()}>
              {busy ? 'Invio…' : 'Conferma: non approvare'}
            </button>
            <button type="button" className="btn-sm" onClick={() => setRejecting(false)} disabled={busy}>Annulla</button>
          </div>
        </>
      )}
      {message && <div className={`alert ${message.ok ? 'ok' : 'error'}`}>{message.text}</div>}
    </div>
  );
}
