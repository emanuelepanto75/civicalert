'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/components/api';

// Il cittadino può chiudere la segnalazione quando il problema è stato risolto.
export default function ResolveButton({ code }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function resolve() {
    if (!window.confirm('Confermi che il problema è stato risolto? La segnalazione verrà chiusa.')) return;
    setLoading(true);
    try {
      await api(`/api/reports/${code}/resolve`, { method: 'POST' });
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {error && <div className="alert error">{error}</div>}
      <button className="btn green" onClick={resolve} disabled={loading}>✓ Il problema è stato risolto</button>
    </>
  );
}
