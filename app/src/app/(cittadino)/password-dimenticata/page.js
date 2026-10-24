'use client';

import { useState } from 'react';
import { api } from '@/components/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    await api('/api/auth/forgot', { body: { email } }).catch(() => {});
    setSent(true);
  }

  return (
    <form className="page" onSubmit={submit}>
      <h1>Password dimenticata</h1>
      <p className="lead">Ti invieremo un link per sceglierne una nuova.</p>
      {sent ? (
        <div className="alert ok">Se l’indirizzo è registrato riceverai un’email a breve.</div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" className="input" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn">Invia link</button>
        </>
      )}
    </form>
  );
}
