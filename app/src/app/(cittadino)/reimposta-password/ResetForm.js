'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/components/api';

export default function ResetForm({ token }) {
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api('/api/auth/reset', { body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
  }

  if (done) {
    return (
      <div className="page">
        <div className="alert ok">Password aggiornata.</div>
        <Link href="/accedi" className="btn">Accedi</Link>
      </div>
    );
  }
  return (
    <form className="page" onSubmit={submit}>
      <h1>Nuova password</h1>
      {error && <div className="alert error">{error}</div>}
      <div className="field">
        <label htmlFor="password">Nuova password (almeno 8 caratteri)</label>
        <input id="password" className="input" type="password" autoComplete="new-password" minLength={8} required
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button className="btn">Salva</button>
    </form>
  );
}
