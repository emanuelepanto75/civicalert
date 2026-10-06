import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireStaffPage } from '@/lib/office';
import OperatorForm from './OperatorForm';
import ToggleOperator from './ToggleOperator';

export const dynamic = 'force-dynamic';

export default async function OperatorsPage() {
  const user = await requireStaffPage('/ufficio/operatori');
  if (user.role !== 'ADMIN') redirect('/ufficio');
  const operators = await prisma.user.findMany({
    where: { role: 'OPERATOR' },
    orderBy: [{ municipality: { name: 'asc' } }, { lastName: 'asc' }],
    include: { municipality: true },
  });

  return (
    <>
      <div className="office-head">
        <div>
          <h1>Operatori comunali</h1>
          <div className="sub">Ogni operatore vede e gestisce solo le segnalazioni del proprio Comune.</div>
        </div>
      </div>
      <div className="detail-grid">
        <section className="panel">
          <h2>{operators.length} operator{operators.length === 1 ? 'e' : 'i'}</h2>
          {operators.length === 0 ? (
            <div className="empty">Nessun operatore. Creane uno con il modulo a destra.</div>
          ) : (
            <table className="otable">
              <thead>
                <tr><th>Nome</th><th>Email</th><th>Comune</th><th>Ultimo accesso</th><th></th></tr>
              </thead>
              <tbody>
                {operators.map((o) => (
                  <tr key={o.id} style={o.isBanned ? { opacity: 0.5 } : undefined}>
                    <td>{o.firstName} {o.lastName}</td>
                    <td className="muted">{o.email}</td>
                    <td>{o.municipality ? `${o.municipality.name} (${o.municipality.provinceCode})` : '—'}</td>
                    <td className="muted">
                      {o.lastLoginAt ? new Date(o.lastLoginAt).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' }) : 'mai'}
                    </td>
                    <td><ToggleOperator id={o.id} active={!o.isBanned} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="panel">
          <h2>Nuovo operatore</h2>
          <OperatorForm />
        </section>
      </div>
    </>
  );
}
