import Link from 'next/link';
import AccountActions from '@/components/office/AccountActions';
import { requireAdminPage } from '@/lib/admin';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const LIST_LIMIT = 200;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: 'short', year: 'numeric' }) : 'mai');
const FILTERS = {
  tutti: { label: 'Tutti', where: {} },
  bloccati: { label: 'Bloccati', where: { isBanned: true } },
  'non-confermati': { label: 'Email non confermata', where: { emailVerifiedAt: null } },
};

export default async function CitizensPage({ searchParams }) {
  await requireAdminPage('/ufficio/cittadini');
  const params = await searchParams;
  const filtro = FILTERS[params.filtro] ? params.filtro : 'tutti';
  const q = (params.q || '').trim().slice(0, 100);

  const where = { role: 'CITIZEN', ...FILTERS[filtro].where };
  if (q) {
    where.OR = ['email', 'firstName', 'lastName', 'phone'].map((field) => ({ [field]: { contains: q, mode: 'insensitive' } }));
  }
  const [citizens, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
      include: { _count: { select: { reports: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  return (
    <>
      <div className="office-head">
        <div>
          <h1>Cittadini</h1>
          <div className="sub">Chi è bloccato non può più accedere né inviare segnalazioni.</div>
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
            <input type="search" name="q" placeholder="Email, nome, cognome, telefono" defaultValue={q} />
          </label>
          <button className="btn-sm primary">Filtra</button>
          <Link href="/ufficio/cittadini" className="btn-sm">Azzera</Link>
        </form>
      </section>

      <section className="panel">
        <h2>
          {total} cittadin{total === 1 ? 'o' : 'i'}
          {total > LIST_LIMIT && <span className="muted"> · mostrati i {LIST_LIMIT} più recenti (usa la ricerca)</span>}
        </h2>
        {citizens.length === 0 ? (
          <div className="empty">Nessun cittadino corrisponde alla ricerca.</div>
        ) : (
          <div className="otable-wrap">
            <table className="otable">
              <thead>
                <tr>
                  <th>Nome</th><th>Email</th><th>Telefono</th><th>Iscritto</th><th>Ultimo accesso</th>
                  <th>Segn.</th><th>Stato</th><th></th>
                </tr>
              </thead>
              <tbody>
                {citizens.map((c) => (
                  <tr key={c.id} style={c.isBanned ? { opacity: 0.6 } : undefined}>
                    <td>{c.firstName} {c.lastName}</td>
                    <td className="muted">{c.email}</td>
                    <td className="muted">{c.phone || '—'}</td>
                    <td className="muted">{fmtDate(c.createdAt)}</td>
                    <td className="muted">{fmtDate(c.lastLoginAt)}</td>
                    <td>{c._count.reports}</td>
                    <td>
                      {c.isBanned ? (
                        <span className="badge REJECTED">Bloccato</span>
                      ) : c.emailVerifiedAt ? (
                        <span className="badge RESOLVED">Attivo</span>
                      ) : (
                        <span className="badge PENDING">Da confermare</span>
                      )}
                    </td>
                    <td>
                      <AccountActions id={c.id} email={c.email} active={!c.isBanned} reports={c._count.reports} />
                    </td>
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
