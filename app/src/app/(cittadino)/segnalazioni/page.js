import Link from 'next/link';
import { prisma } from '@/lib/db';
import { publicReport } from '@/lib/reports';
import FilterForm from './FilterForm';

export const metadata = { title: 'Segnalazioni per Comune – CivicAlerts' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;
const STATI = {
  aperte: { label: 'Aperte', one: 'aperta', statuses: ['PENDING', 'SENT', 'ACKNOWLEDGED'] },
  risolte: { label: 'Risolte', one: 'risolta', statuses: ['RESOLVED'] },
  tutte: { label: 'Tutte', statuses: ['PENDING', 'SENT', 'ACKNOWLEDGED', 'RESOLVED'] },
};
const fmtDate = (d) => new Date(d).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: 'short', year: 'numeric' });

// Elenco pubblico: chiunque vede le segnalazioni di un Comune, mai chi le ha fatte.
// Le segnalazioni ripetute dello stesso problema compaiono una volta sola, con il numero.
export default async function PublicReportsPage({ searchParams }) {
  const params = await searchParams;
  const stato = STATI[params.stato] ? params.stato : 'aperte';
  const pagina = Math.max(1, Number.parseInt(params.pagina, 10) || 1);

  const visible = { duplicateOfId: null, municipalityId: { not: null } };
  const groups = await prisma.report.groupBy({
    by: ['municipalityId'],
    where: { ...visible, status: { not: 'REJECTED' } },
    _count: { _all: true },
  });
  const comuni = await prisma.municipality.findMany({
    where: { id: { in: groups.map((g) => g.municipalityId) } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, provinceCode: true },
  });
  const comune = comuni.find((c) => c.id === params.comune) || null;

  const where = { ...visible, status: { in: STATI[stato].statuses }, ...(comune && { municipalityId: comune.id }) };
  const [rows, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE * pagina,
      include: { category: true, municipality: true, _count: { select: { duplicates: true } } },
    }),
    prisma.report.count({ where }),
  ]);
  const reports = rows.map((r) => ({ ...publicReport(r), sameProblem: r._count.duplicates + 1 }));
  const more = new URLSearchParams({ ...(comune && { comune: comune.id }), stato, pagina: String(pagina + 1) });

  return (
    <div className="page">
      <div>
        <h1>Segnalazioni per Comune</h1>
        <p className="lead" style={{ marginTop: 4 }}>Cosa hanno segnalato i cittadini e a che punto è. Non vengono mostrati i dati di chi ha segnalato.</p>
      </div>

      <FilterForm
        comuni={comuni.map((c) => ({ id: c.id, label: `${c.name} (${c.provinceCode})` }))}
        comune={comune?.id || ''}
        stato={stato}
        stati={Object.fromEntries(Object.entries(STATI).map(([k, v]) => [k, v.label]))}
      />

      <div className="muted">
        {total === 1 ? '1 segnalazione' : `${total} segnalazioni`}
        {stato !== 'tutte' && ` ${total === 1 ? STATI[stato].one : STATI[stato].label.toLowerCase()}`}
        {comune ? ` nel Comune di ${comune.name}` : ' in tutti i Comuni'}
      </div>

      {reports.length === 0 ? (
        <div className="card"><div className="card-body center"><p className="muted">Nessuna segnalazione.</p></div></div>
      ) : (
        <div className="card">
          {reports.map((r) => (
            <Link key={r.code} href={`/segnalazioni/${r.code}`} className="report-item">
              {r.mediaType === 'PHOTO' ? (
                <img className="report-thumb" src={r.mediaUrl} alt="" loading="lazy" />
              ) : (
                <div className="report-thumb">{r.category.icon}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="title">{r.category.icon} {r.category.name}</div>
                <div className="meta">{r.address || r.municipality || 'Posizione GPS'}</div>
                <div className="meta">
                  Segnalata il {fmtDate(r.createdAt)}
                  {r.sameProblem > 1 && ` · da ${r.sameProblem} cittadini`}
                </div>
                <span className={`badge ${r.status}`} style={{ marginTop: 6 }}>{r.statusLabel}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {total > reports.length && (
        <Link href={`/segnalazioni?${more}`} className="btn secondary" scroll={false}>Mostra altre</Link>
      )}
    </div>
  );
}
