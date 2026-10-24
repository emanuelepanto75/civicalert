'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/components/api';

export default function RetryDelivery({ id, all = false, label = 'Riprova' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      await api('/api/ufficio/deliveries/retry', { body: all ? { all: true } : { id } });
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className={`btn-sm ${all ? 'accent' : ''}`} onClick={retry} disabled={busy}>
        {busy ? 'Invio…' : label}
      </button>
      {error && <span className="muted"> {error}</span>}
    </>
  );
}
