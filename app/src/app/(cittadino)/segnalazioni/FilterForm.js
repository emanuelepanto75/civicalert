'use client';

import { useRouter } from 'next/navigation';

// Filtri dell'elenco pubblico: si applicano appena si cambia una scelta.
export default function FilterForm({ comuni, comune, stato, stati }) {
  const router = useRouter();
  function go(next) {
    const q = new URLSearchParams({ ...(next.comune && { comune: next.comune }), stato: next.stato });
    router.push(`/segnalazioni?${q}`);
  }
  return (
    <div className="card">
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label htmlFor="comune">Comune</label>
          <select id="comune" className="input" value={comune} onChange={(e) => go({ comune: e.target.value, stato })}>
            <option value="">Tutti i Comuni</option>
            {comuni.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="stato">Stato</label>
          <select id="stato" className="input" value={stato} onChange={(e) => go({ comune, stato: e.target.value })}>
            {Object.entries(stati).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
