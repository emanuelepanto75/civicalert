'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/components/api';

// Note interne dell'ufficio (non visibili al cittadino).
export default function NoteForm({ code }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api(`/api/ufficio/reports/${code}/note`, { body: { note } });
      setNote('');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="Aggiungi una nota interna (non visibile al cittadino)" />
      {error && <div className="alert error">{error}</div>}
      <div><button className="btn-sm" disabled={saving || !note.trim()}>Aggiungi nota</button></div>
    </form>
  );
}
