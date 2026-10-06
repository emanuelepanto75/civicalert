'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/components/api';

const FIELDS = [
  { name: 'firstName', label: 'Nome', autoComplete: 'given-name' },
  { name: 'lastName', label: 'Cognome', autoComplete: 'family-name' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'phone', label: 'Telefono', type: 'tel', autoComplete: 'tel' },
  { name: 'password', label: 'Password (almeno 8 caratteri)', type: 'password', autoComplete: 'new-password' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', privacy: false });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api('/api/auth/register', { body: form });
      if (res.verified) window.location.href = '/';
      else router.push('/accedi?registrato=1');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <form className="page" onSubmit={submit}>
      <h1>Crea un account</h1>
      <p className="lead">Servono pochi dati: li inoltriamo al Comune solo insieme alle tue segnalazioni.</p>
      {error && <div className="alert error">{error}</div>}

      {FIELDS.map((f) => (
        <div className="field" key={f.name}>
          <label htmlFor={f.name}>{f.label}</label>
          <input id={f.name} className="input" type={f.type || 'text'} autoComplete={f.autoComplete} required
            minLength={f.name === 'password' ? 8 : undefined}
            value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
        </div>
      ))}

      <label className="check">
        <input type="checkbox" checked={form.privacy} required
          onChange={(e) => setForm({ ...form, privacy: e.target.checked })} />
        <span>
          Ho letto e accetto l’<Link href="/privacy" target="_blank">informativa sulla privacy</Link>.
        </span>
      </label>

      <button className="btn" disabled={loading}>
        {loading ? <span className="spinner" /> : 'Registrati'}
      </button>
      <div className="center muted">
        Hai già un account? <Link href="/accedi">Accedi</Link>
      </div>
    </form>
  );
}
