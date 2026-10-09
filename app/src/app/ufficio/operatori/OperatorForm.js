'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/components/api';

const EMPTY = { firstName: '', lastName: '', email: '', password: '' };

export default function OperatorForm() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [municipality, setMunicipality] = useState(null);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  // Ricerca del Comune mentre si scrive.
  useEffect(() => {
    if (municipality || query.trim().length < 2) return setOptions([]);
    const t = setTimeout(() => {
      api(`/api/ufficio/municipalities?q=${encodeURIComponent(query.trim())}`)
        .then((res) => setOptions(res.municipalities))
        .catch(() => setOptions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query, municipality]);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setDone(null);
    try {
      await api('/api/ufficio/operators', { body: { ...form, municipalityId: municipality?.id } });
      setDone(`Creato l’operatore ${form.email} per il Comune di ${municipality.name}. Comunicagli la password: potrà cambiarla con “Password dimenticata”.`);
      setForm(EMPTY);
      setMunicipality(null);
      setQuery('');
      router.refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  const field = (name, label, type = 'text') => (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} className="input" type={type} required value={form[name]}
        minLength={name === 'password' ? 8 : undefined}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })} />
    </div>
  );

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {done && <div className="alert ok">{done}</div>}
      {error && <div className="alert error">{error}</div>}
      <div className="field">
        <label htmlFor="comune">Comune</label>
        {municipality ? (
          <div className="info-box ok">
            <span className="value">🏛 {municipality.name} ({municipality.provinceCode})</span>
            <span className="sub">{municipality.pecAddress || 'PEC non configurata'}</span>
            <button type="button" className="btn-sm" style={{ alignSelf: 'flex-start', marginTop: 6 }}
              onClick={() => setMunicipality(null)}>Cambia</button>
          </div>
        ) : (
          <>
            <input id="comune" className="input" placeholder="Scrivi il nome del Comune…" value={query}
              onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
            {options.length > 0 && (
              <div className="card">
                {options.map((m) => (
                  <button type="button" key={m.id} className="report-item"
                    style={{ width: '100%', border: 'none', background: '#fff', cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => setMunicipality(m)}>
                    🏛 {m.name} ({m.provinceCode})
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {field('firstName', 'Nome')}
      {field('lastName', 'Cognome')}
      {field('email', 'Email', 'email')}
      {field('password', 'Password iniziale (almeno 8 caratteri)', 'password')}
      <button className="btn" disabled={!municipality}>Crea operatore</button>
    </form>
  );
}
