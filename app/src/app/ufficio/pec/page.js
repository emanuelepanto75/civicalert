import Link from 'next/link';
import RetryDelivery from '@/components/office/RetryDelivery';
import { requireAdminPage } from '@/lib/admin';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const LIST_LIMIT = 200;
const fmt = (d) => (d ? new Date(d).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' }) : '—');
const STATES = {
  '': 'Tutti',
  FAILED: 'Non consegnati',
  PENDING: 'In attesa',
  SENT: 'Inviati',
};
const BADGE = {
  SENT: ['RESOLVED', 'Inviata'],
  PENDING: ['ACKNOWLEDGED', 'In attesa'],
  FAILED: ['REJECTED', 'Non consegnata'],
};

export default async function DeliveriesPage({ searchParams }) {
  await requireAdminPage('/ufficio/pec');
  const params = await searchParams;
  const stato = STATES[params.stato] && params.stato ? params.stato : '';
  const where = stato ? { status: stato } : {};

  const [deliveries, total, counts] = await Promise.all([
    prisma.delivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
      include: { report: { include: { municipality: true, category: true } } },
    }),
    prisma.delivery.count({ where }),
    prisma.delivery.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const count = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));

  return (
    <>
      <div className="office-head">
        <div>
          <h1>Invii PEC</h1>
          <div className="sub">Ogni segnalazione viene inviata via PEC al Comune; in caso di errore si riprova 3 volte in automatico.</div>
        </div>
        {count.FAILED > 0 && <RetryDelivery all label={`Riprova tutte le non consegnate (${count.FAILED})`} />}
      </div>

      {config.pecOverrideTo && (
        <div className="alert warn">
          <strong>Modalità collaudo:</strong> le PEC partono verso <strong>{config.pecOverrideTo}</strong>, non verso i
          destinatari indicati in tabella.
        </div>
      )}

      <section className="panel">
        <div className="filters">
          {Object.entries(STATES).map(([key, label]) => (
            <Link key={key} href={key ? `/ufficio/pec?stato=${key}` : '/ufficio/pec'} className={`btn-sm ${stato === key ? 'primary' : ''}`}>
              {label}{key && ` (${count[key] || 0})`}
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>
          {total} invi{total === 1 ? 'o' : 'i'}
          {total > LIST_LIMIT && <span className="muted"> · mostrati i {LIST_LIMIT} più recenti</span>}
        </h2>
        {deliveries.length === 0 ? (
          <div className="empty">Nessun invio.</div>
        ) : (
          <div className="otable-wrap">
            <table className="otable">
              <thead>
                <tr>
                  <th>Creato</th><th>Segnalazione</th><th>Comune</th><th>Destinatario</th><th>Stato</th>
                  <th>Tentativi</th><th>Inviata</th><th>Ultimo errore</th><th></th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id}>
                    <td className="muted">{fmt(d.createdAt)}</td>
                    <td>
                      <Link href={`/ufficio/segnalazioni/${d.report.code}`} className="code">{d.report.code}</Link>
                      <div className="muted">{d.report.category.icon} {d.report.category.name}</div>
                    </td>
                    <td>{d.report.municipality?.name || '—'}</td>
                    <td className="muted">{d.recipient}</td>
                    <td><span className={`badge ${BADGE[d.status][0]}`}>{BADGE[d.status][1]}</span></td>
                    <td>{d.attempts}</td>
                    <td className="muted">{fmt(d.sentAt)}</td>
                    <td className="muted" style={{ maxWidth: 280 }}>{d.lastError || '—'}</td>
                    <td>{d.status !== 'SENT' && <RetryDelivery id={d.id} />}</td>
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
