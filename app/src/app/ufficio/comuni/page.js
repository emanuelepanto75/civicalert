import Link from 'next/link';
import MunicipalityEdit from '@/components/office/MunicipalityEdit';
import { requireAdminPage } from '@/lib/admin';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const LIST_LIMIT = 100;
const FILTERS = {
  attivi: { label: 'Con segnalazioni', where: { reports: { some: {} } } },
  'senza-pec': { label: 'Senza PEC o invio disattivato', where: { OR: [{ pecAddress: null }, { notifyPec: false }] } },
  tutti: { label: 'Tutti i comuni', where: {} },
};

export default async function MunicipalitiesPage({ searchParams }) {
  await requireAdminPage('/ufficio/comuni');
  const params = await searchParams;
  const q = (params.q || '').trim().slice(0, 80);
  // Con una ricerca si cerca fra tutti i comuni, altrimenti si parte da quelli con segnalazioni
  const filtro = FILTERS[params.filtro] ? params.filtro : q ? 'tutti' : 'attivi';

  const where = { ...FILTERS[filtro].where, ...(q && { name: { contains: q, mode: 'insensitive' } }) };
  const [rows, total] = await Promise.all([
    prisma.municipality.findMany({
      where,
      orderBy: [{ name: 'asc' }, { provinceCode: 'asc' }],
      take: LIST_LIMIT,
      include: {
        _count: { select: { reports: true } },
        operators: { where: { role: 'OPERATOR', isBanned: false }, select: { id: true } },
      },
    }),
    prisma.municipality.count({ where }),
  ]);

  return (
    <>
      <div className="office-head">
        <div>
          <h1>Comuni</h1>
          <div className="sub">Indirizzo PEC a cui arrivano le segnalazioni. I dati iniziali vengono dall’Indice PA: qui puoi correggerli.</div>
        </div>
      </div>

      <section className="panel">
        <form className="filters" method="get">
          <label>
            Mostra
            <select name="filtro" defaultValue={filtro}>
              {Object.entries(FILTERS).map(([key, f]) => <option key={key} value={key}>{f.label}</option>)}
            </select>
          </label>
          <label className="grow">
            Cerca
            <input type="search" name="q" placeholder="Nome del Comune" defaultValue={q} />
          </label>
          <button className="btn-sm primary">Cerca</button>
          <Link href="/ufficio/comuni" className="btn-sm">Azzera</Link>
        </form>
      </section>

      <section className="panel">
        <h2>
          {total} comun{total === 1 ? 'e' : 'i'}
          {total > LIST_LIMIT && <span className="muted"> · mostrati i primi {LIST_LIMIT} (usa la ricerca)</span>}
        </h2>
        {rows.length === 0 ? (
          <div className="empty">Nessun Comune corrisponde alla ricerca.</div>
        ) : (
          <div className="otable-wrap">
            <table className="otable">
              <thead>
                <tr><th>Comune</th><th>Regione</th><th>PEC</th><th>Invio</th><th>Segnalazioni</th><th>Operatori</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.name}</strong> <span className="muted">({m.provinceCode})</span></td>
                    <td className="muted">{m.region}</td>
                    <td className="muted">{m.pecAddress || <span style={{ color: '#b91c1c' }}>mancante</span>}</td>
                    <td>{m.pecAddress && m.notifyPec ? <span className="badge RESOLVED">Attivo</span> : <span className="badge REJECTED">No</span>}</td>
                    <td>
                      {m._count.reports > 0
                        ? <Link href={`/ufficio?stato=tutte&comune=${m.id}`}>{m._count.reports}</Link>
                        : <span className="muted">0</span>}
                    </td>
                    <td>{m.operators.length || <span className="muted">nessuno</span>}</td>
                    <td><MunicipalityEdit id={m.id} pecAddress={m.pecAddress} notifyPec={m.notifyPec} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
