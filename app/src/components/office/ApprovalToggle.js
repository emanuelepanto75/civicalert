'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/components/api';

// Interruttore: le nuove segnalazioni aspettano l'approvazione prima della PEC.
export default function ApprovalToggle({ enabled }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await api('/api/ufficio/settings', { method: 'PATCH', body: { approvalRequired: !enabled } });
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ margin: 0 }}>Approvazione prima dell’invio: {enabled ? 'attiva' : 'disattivata'}</h2>
        <div className="muted small" style={{ marginTop: 4 }}>
          {enabled
            ? 'Le nuove segnalazioni restano qui finché non le approvi; solo allora parte la PEC al Comune. Il cittadino ne è avvisato quando segnala.'
            : 'Le nuove segnalazioni partono subito via PEC verso il Comune, senza passare da qui.'}
        </div>
        {error && <div className="alert error" style={{ marginTop: 8 }}>{error}</div>}
      </div>
      <button type="button" className={`btn-sm ${enabled ? '' : 'primary'}`} onClick={toggle} disabled={busy}>
        {busy ? 'Salvataggio…' : enabled ? 'Disattiva (invio diretto)' : 'Attiva l’approvazione'}
      </button>
    </div>
  );
}
