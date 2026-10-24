import Link from 'next/link';
import { config } from '@/lib/config';

export const metadata = { title: 'Chi siamo – CivicAlerts' };

export default function ChiSiamoPage() {
  const { email } = config.privacy;
  return (
    <div className="page">
      <div>
        <h1>CivicAlerts</h1>
        <p className="lead" style={{ marginTop: 4 }}>Segnala un problema della tua città, al Comune giusto.</p>
      </div>
      <div className="card">
        <div className="card-body privacy-text">
          <p>
            Con una foto e la posizione, CivicAlerts invia la segnalazione via PEC al Comune competente e ti tiene
            aggiornato: stato, risposta del Comune e numero di protocollo.
          </p>
          <h2>Progettato da</h2>
          <p style={{ fontSize: 18, fontWeight: 700 }}>Emanuele Pantò &amp; Massimo Filippello</p>
          <h2>Contatti</h2>
          <p>
            Email: <a href={`mailto:${email}`}>{email}</a>
            <br />
            Sito: <a href="https://civicalerts.it" target="_blank" rel="noreferrer">civicalerts.it</a>
          </p>
          <p className="muted small">
            <Link href="/privacy">Privacy e cookie</Link> · <Link href="/">Torna alla mappa</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
