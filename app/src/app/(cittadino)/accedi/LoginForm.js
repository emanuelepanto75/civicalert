'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/components/api';

export default function LoginForm({ verifica, next, registrato }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const { user } = await api('/api/auth/login', { body: { email, password } });
      // gli operatori comunali vanno direttamente al cruscotto dell'ufficio
      const staff = user.role !== 'CITIZEN';
      // navigazione completa: aggiorna anche l'intestazione con il nome utente
      window.location.href = staff && next === '/' ? '/ufficio' : next;
    } catch (err) {
      setError(err.message);
      setNeedsVerification(Boolean(err.needsVerification));
      setLoading(false);
    }
  }

  async function resend() {
    await api('/api/auth/resend', { body: { email } }).catch(() => {});
    setInfo('Ti abbiamo inviato di nuovo l’email di conferma.');
  }

  return (
    <form className="page" onSubmit={submit}>
      <h1>Accedi</h1>
      <p className="lead">Entra per inviare e seguire le tue segnalazioni.</p>

      {verifica === 'ok' && <div className="alert ok">✅ Email confermata! Ora puoi accedere.</div>}
      {verifica === 'errore' && <div className="alert error">Link di conferma non valido o già usato.</div>}
      {registrato && (
        <div className="alert info">
          📧 Registrazione completata. Ti abbiamo inviato un’email: apri il link per confermare l’indirizzo, poi accedi.
        </div>
      )}
      {error && <div className="alert error">{error}</div>}
      {info && <div className="alert ok">{info}</div>}

      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" className="input" type="email" autoComplete="email" required
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" className="input" type="password" autoComplete="current-password" required
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <button className="btn" disabled={loading}>
        {loading ? <span className="spinner" /> : 'Accedi'}
      </button>
      {needsVerification && (
        <button type="button" className="btn secondary" onClick={resend}>Invia di nuovo l’email di conferma</button>
      )}

      <div className="center muted">
        <Link href="/password-dimenticata">Password dimenticata?</Link>
      </div>
      <div className="divider" />
      <div className="center muted">Non hai un account?</div>
      <Link href="/registrati" className="btn secondary">Registrati</Link>
    </form>
  );
}
