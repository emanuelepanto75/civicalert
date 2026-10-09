import AccountActions from '@/components/office/AccountActions';
import { requireAdminPage } from '@/lib/admin';
import { prisma } from '@/lib/db';
import OperatorForm from './OperatorForm';

export const dynamic = 'force-dynamic';

export default async function OperatorsPage() {
  await requireAdminPage('/ufficio/operatori');
  const [operators, activity] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'OPERATOR' },
      orderBy: [{ municipality: { name: 'asc' } }, { lastName: 'asc' }],
      include: { municipality: true },
    }),
    // Cambi di stato e note scritti da ciascun operatore
    prisma.reportEvent.groupBy({ by: ['actorId'], where: { actor: { role: 'OPERATOR' } }, _count: { _all: true } }),
  ]);
  const actions = new Map(activity.map((a) => [a.actorId, a._count._all]));

  return (
    <>
      <div className="office-head">
        <div>
          <h1>Operatori comunali</h1>
          <div className="sub">Ogni operatore vede e gestisce solo le segnalazioni del proprio Comune.</div>
        </div>
      </div>
      <section className="panel">
        <h2>{operators.length} operator{operators.length === 1 ? 'e' : 'i'}</h2>
        {operators.length === 0 ? (
          <div className="empty">Nessun operatore. Creane uno con il modulo qui sotto.</div>
        ) : (
          <div className="otable-wrap">
            <table className="otable">
              <thead>
                <tr><th>Nome</th><th>Email</th><th>Comune</th><th>Ultimo accesso</th><th>Interventi</th><th>Stato</th><th></th></tr>
              </thead>
              <tbody>
                {operators.map((o) => (
                  <tr key={o.id} style={o.isBanned ? { opacity: 0.6 } : undefined}>
                    <td>{o.firstName} {o.lastName}</td>
                    <td className="muted">{o.email}</td>
                    <td>{o.municipality ? `${o.municipality.name} (${o.municipality.provinceCode})` : '—'}</td>
                    <td className="muted">
                      {o.lastLoginAt ? new Date(o.lastLoginAt).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' }) : 'mai'}
                    </td>
                    <td title="Cambi di stato e note registrati">{actions.get(o.id) || 0}</td>
                    <td>{o.isBanned ? <span className="badge REJECTED">Bloccato</span> : <span className="badge RESOLVED">Attivo</span>}</td>
                    <td><AccountActions id={o.id} email={o.email} active={!o.isBanned} allowPassword /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="panel" style={{ maxWidth: 560 }}>
        <h2>Nuovo operatore</h2>
        <OperatorForm />
      </section>
    </>
  );
}
