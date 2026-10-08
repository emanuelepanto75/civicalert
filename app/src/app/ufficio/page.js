import Link from 'next/link';
import ReportsMap from '@/components/ReportsMap';
import { prisma } from '@/lib/db';
import { mediaUrl } from '@/lib/media';
import { OFFICE_STATUS, STATUS_FILTERS, buildWhere, dashboardStats, parseFilters, requireStaffPage } from '@/lib/office';

export const dynamic = 'force-dynamic';

const LIST_LIMIT = 200;
const fmtDate = (d) => new Date(d).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: 'short', year: 'numeric' });
const fmtDays = (n) => (n == null ? '—' : n < 1 ? '< 1' : n.toLocaleString('it-IT', { maximumFractionDigits: 1 }));

export default async function OfficeDashboard({ searchParams }) {
  const user = await requireStaffPage();
  const params = await searchParams;
  const filters = parseFilters(params);

  const citizen = user.role === 'ADMIN' && filters.utente
    ? await prisma.user.findUnique({ where: { id: filters.utente }, select: { firstName: true, lastName: true, email: true } })
    : null;
  const [stats, reports, total, comuni] = await Promise.all([
    dashboardStats(user, filters),
    prisma.report.findMany({
      where: buildWhere(user, filters),
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
      include: { category: true, municipality: true, duplicateOf: { select: { code: true } }, _count: { select: { duplicates: true } } },
    }),
    prisma.report.count({ where: buildWhere(user, filters) }),
    user.role === 'ADMIN' ? adminMunicipalities() : [],
  ]);

  const exportQuery = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  const maxCount = Math.max(1, ...stats.byCategory.map((c) => c.count));
  const mapReports = reports.map((r) => ({
    code: r.code,
    latitude: r.latitude,
    longitude: r.longitude,
    address: r.address,
    municipality: r.municipality?.name,
    status: r.status,
    statusLabel: OFFICE_STATUS[r.status],
    mediaType: r.mediaType,
    mediaUrl: mediaUrl(r.mediaPath),
    category: { name: r.category.name, icon: r.category.icon, color: r.category.color },
  }));

  return (
    <>
      <div className="office-head">
        <div>
          <h1>Segnalazioni</h1>
          <div className="sub">Situazione aggiornata al {fmtDate(new Date())}</div>
        </div>
      </div>

      {citizen && (
        <div className="alert info">
          Stai vedendo solo le segnalazioni di <strong>{citizen.firstName} {citizen.lastName}</strong> ({citizen.email}).{' '}
          <Link href="/ufficio">Mostra tutte</Link>
        </div>
      )}

      <section className="kpis" aria-label="Indicatori">
        <Link href="/ufficio?stato=nuove" className="kpi accent">
          <div className="num">{stats.nuove}</div>
          <div className="lbl">Da prendere in carico</div>
          <div className="hint">Arrivate e non ancora gestite</div>
        </Link>
        <Link href="/ufficio?stato=lavorazione" className="kpi">
          <div className="num">{stats.lavorazione}</div>
          <div className="lbl">In lavorazione</div>
          <div className="hint">Prese in carico dall’ufficio</div>
        </Link>
        <Link href="/ufficio?stato=risolte" className="kpi">
          <div className="num">{stats.risolte30}</div>
          <div className="lbl">Risolte</div>
          <div className="hint">Negli ultimi 30 giorni</div>
        </Link>
        <div className="kpi">
          <div className="num">{fmtDays(stats.avgDays)}</div>
          <div className="lbl">Giorni medi per risolvere</div>
          <div className="hint">Segnalazioni chiuse negli ultimi 90 giorni</div>
        </div>
      </section>

      <section className="panels">
        <div className="panel">
          <h2>Segnalazioni aperte per categoria</h2>
          {stats.byCategory.length === 0 ? (
            <div className="empty">Nessuna segnalazione aperta.</div>
          ) : (
            <div className="bars">
              {stats.byCategory.map((c) => (
                <Link
                  key={c.id}
                  href={`/ufficio?stato=aperte&categoria=${c.id}`}
                  className="bar-row"
                  title={`${c.name}: ${c.count} aperte`}
                  style={{ textDecoration: 'none' }}
                >
                  <span className="name">{c.icon} {c.name}</span>
                  <span className="bar-track">
                    <span className="bar-fill" style={{ display: 'block', width: `${(c.count / maxCount) * 100}%` }} />
                  </span>
                  <span className="val">{c.count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="panel">
          <h2>Mappa · {STATUS_FILTERS[filters.stato].label.toLowerCase()}</h2>
          <div className="office-map">
            <ReportsMap reports={mapReports} linkBase="/ufficio/segnalazioni/" legend={false} />
          </div>
        </div>
      </section>

      <section className="panel">
        <form className="filters" method="get">
          {citizen && <input type="hidden" name="utente" value={filters.utente} />}
          <label>
            Stato
            <select name="stato" defaultValue={filters.stato}>
              {Object.entries(STATUS_FILTERS).map(([key, f]) => (
                <option key={key} value={key}>{f.label}</option>
              ))}
            </select>
          </label>
          <label>
            Categoria
            <select name="categoria" defaultValue={filters.categoria}>
              <option value="">Tutte</option>
              {stats.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          {user.role === 'ADMIN' && (
            <label>
              Comune
              <select name="comune" defaultValue={filters.comune}>
                <option value="">Tutti</option>
                {comuni.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.provinceCode})</option>
                ))}
              </select>
            </label>
          )}
          <label>
            Dal
            <input type="date" name="dal" defaultValue={filters.dal} />
          </label>
          <label>
            Al
            <input type="date" name="al" defaultValue={filters.al} />
          </label>
          <label className="grow">
            Cerca
            <input type="search" name="q" placeholder="Codice, indirizzo, descrizione" defaultValue={filters.q} />
          </label>
          <button className="btn-sm primary">Filtra</button>
          <Link href="/ufficio" className="btn-sm">Azzera</Link>
          <a href={`/api/ufficio/export?${exportQuery}`} className="btn-sm" style={{ marginLeft: 'auto' }}>⬇ Esporta CSV</a>
        </form>
      </section>

      <section className="panel">
        <h2>
          {total} segnalazion{total === 1 ? 'e' : 'i'}
          {total > LIST_LIMIT && <span className="muted"> · mostrate le {LIST_LIMIT} più recenti (usa i filtri o l’esportazione)</span>}
        </h2>
        {reports.length === 0 ? (
          <div className="empty">Nessuna segnalazione corrisponde ai filtri.</div>
        ) : (
          <div className="otable-wrap">
            <table className="otable">
              <thead>
                <tr>
                  <th></th>
                  <th>Codice</th>
                  <th>Categoria</th>
                  <th>Indirizzo</th>
                  {user.role === 'ADMIN' && <th>Comune</th>}
                  <th>Data</th>
                  <th>Stato</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.mediaType === 'PHOTO' ? (
                        <img className="thumb" src={mediaUrl(r.mediaPath)} alt="" loading="lazy" />
                      ) : (
                        <div className="thumb">{r.category.icon}</div>
                      )}
                    </td>
                    <td><Link href={`/ufficio/segnalazioni/${r.code}`} className="code">{r.code}</Link></td>
                    <td>{r.category.icon} {r.category.name}</td>
                    <td>
                      {r.address || '—'}
                      {r._count.duplicates > 0 && <div className="muted">👥 Segnalata da {r._count.duplicates + 1} cittadini</div>}
                      {r.duplicateOf && <div className="muted">↪ Stesso problema di {r.duplicateOf.code}</div>}
                      {r.authenticity.length > 0 && <div className="muted">⚠️ Da verificare</div>}
                    </td>
                    {user.role === 'ADMIN' && <td>{r.municipality?.name || '—'}</td>}
                    <td className="muted">{fmtDate(r.createdAt)}</td>
                    <td><span className={`badge ${r.status}`}>{OFFICE_STATUS[r.status]}</span></td>
                    <td><Link href={`/ufficio/segnalazioni/${r.code}`} className="btn-sm">Apri</Link></td>
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

// Per l'amministratore: i Comuni che hanno almeno una segnalazione.
async function adminMunicipalities() {
  const groups = await prisma.report.groupBy({ by: ['municipalityId'], where: { municipalityId: { not: null } } });
  return prisma.municipality.findMany({
    where: { id: { in: groups.map((g) => g.municipalityId) } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, provinceCode: true },
  });
}
