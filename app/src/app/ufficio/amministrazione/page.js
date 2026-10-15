import Link from 'next/link';
import { formatBytes, platformOverview, requireAdminPage } from '@/lib/admin';
import { config } from '@/lib/config';
import { OFFICE_STATUS } from '@/lib/office';

export const dynamic = 'force-dynamic';

const fmtDate = (d, opts = { day: '2-digit', month: 'short' }) => new Date(d).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', ...opts });
const fmtNum = (n, digits = 0) => (n == null ? '—' : n.toLocaleString('it-IT', { maximumFractionDigits: digits }));
const AUTH_LABEL = {
  FOTO_SCATTATA_ALTROVE: 'foto scattata altrove',
  FOTO_VECCHIA: 'foto vecchia',
  GPS_IMPRECISO: 'GPS impreciso',
};

export default async function AdminOverview() {
  await requireAdminPage('/ufficio/amministrazione');
  const o = await platformOverview();
  const maxWeek = Math.max(1, ...o.trend.map((w) => Math.max(w.reports, w.users)));

  return (
    <>
      <div className="office-head">
        <div>
          <h1>Panoramica della piattaforma</h1>
          <div className="sub">Tutti i Comuni · aggiornata al {fmtDate(new Date(), { dateStyle: 'long' })}</div>
        </div>
      </div>

      {config.pecOverrideTo && (
        <div className="alert warn">
          <strong>Modalità collaudo attiva:</strong> tutte le PEC vengono inviate a <strong>{config.pecOverrideTo}</strong> e
          non ai Comuni. Per partire davvero svuota <code>PEC_OVERRIDE_TO</code> nel file <code>.env</code>.
        </div>
      )}
      {o.deliveriesFailed > 0 && (
        <div className="alert error">
          <strong>{o.deliveriesFailed} PEC non consegnat{o.deliveriesFailed === 1 ? 'a' : 'e'}</strong> dopo tutti i tentativi.{' '}
          <Link href="/ufficio/pec?stato=FAILED">Vedi e riprova →</Link>
        </div>
      )}

      <section className="kpis" aria-label="Indicatori">
        <Link href="/ufficio/cittadini" className="kpi">
          <div className="num">{fmtNum(o.citizens)}</div>
          <div className="lbl">Cittadini registrati</div>
          <div className="hint">+{o.citizens7} negli ultimi 7 giorni</div>
        </Link>
        <Link href="/ufficio?stato=tutte" className="kpi">
          <div className="num">{fmtNum(o.reportsTotal)}</div>
          <div className="lbl">Segnalazioni totali</div>
          <div className="hint">+{o.reports7} negli ultimi 7 giorni</div>
        </Link>
        <div className="kpi">
          <div className="num">{o.ranking.length}</div>
          <div className="lbl">Comuni raggiunti</div>
          <div className="hint">con almeno una segnalazione</div>
        </div>
        <Link href="/ufficio/pec" className={`kpi ${o.deliveriesFailed ? 'accent' : ''}`}>
          <div className="num">{o.pecToday}</div>
          <div className="lbl">PEC inviate oggi</div>
          <div className="hint">
            {o.deliveriesPending} in attesa · {o.deliveriesFailed} non consegnate
          </div>
        </Link>
      </section>

      <section className="panels">
        <div className="panel">
          <h2>Andamento settimanale</h2>
          <div className="legend">
            <span><i className="dot navy" /> Segnalazioni</span>
            <span><i className="dot accent" /> Nuovi iscritti</span>
          </div>
          <div className="week-chart" role="img" aria-label="Segnalazioni e nuovi iscritti per settimana">
            {o.trend.map((w) => (
              <div key={w.start.toISOString()} className="week" title={`Settimana del ${fmtDate(w.start)}: ${w.reports} segnalazioni, ${w.users} iscritti`}>
                <div className="cols">
                  <span className="col navy" style={{ height: `${(w.reports / maxWeek) * 100}%` }} />
                  <span className="col accent" style={{ height: `${(w.users / maxWeek) * 100}%` }} />
                </div>
                <div className="wk">{fmtDate(w.start, { day: 'numeric', month: 'numeric' })}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Stato del sistema</h2>
          <dl className="facts">
            <dt>Database</dt>
            <dd>{formatBytes(o.dbBytes)}</dd>
            <dt>Foto e video</dt>
            <dd>{formatBytes(o.uploadBytes)}</dd>
            <dt>Invio PEC</dt>
            <dd>{config.pecOverrideTo ? `collaudo → ${config.pecOverrideTo}` : 'ai Comuni'}</dd>
            <dt>Casella PEC</dt>
            <dd>{config.pecSmtp.user || `${config.pecSmtp.host} (senza accesso)`}</dd>
            <dt>Email cittadini</dt>
            <dd>{config.smtp.user || `${config.smtp.host} (senza accesso)`}</dd>
          </dl>
          <p className="muted" style={{ marginTop: 12 }}>
            Il backup si controlla sul server: cartella <code>backup</code> (Windows) o <code>/var/backups/civicalert</code> (cloud).
          </p>
        </div>
      </section>

      <section className="panel">
        <h2>Comuni · classifica per segnalazioni</h2>
        {o.ranking.length === 0 ? (
          <div className="empty">Ancora nessuna segnalazione.</div>
        ) : (
          <div className="otable-wrap">
            <table className="otable">
              <thead>
                <tr>
                  <th>Comune</th><th>Totali</th><th>Aperte</th><th>Risolte</th><th>% risolte</th>
                  <th>Giorni medi</th><th>Operatori</th><th>PEC del Comune</th><th></th>
                </tr>
              </thead>
              <tbody>
                {o.ranking.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.name}</strong> <span className="muted">({m.provinceCode})</span></td>
                    <td>{m.total}</td>
                    <td>{m.open}</td>
                    <td>{m.resolved}</td>
                    <td>{fmtNum(m.resolvedPct)}%</td>
                    <td>{m.avgDays == null ? '—' : m.avgDays < 1 ? '< 1' : fmtNum(m.avgDays, 1)}</td>
                    <td>{m.operators ? m.operators : <span className="muted">nessuno</span>}</td>
                    <td className="muted">{m.pecAddress || '⚠️ mancante'}</td>
                    <td><Link href={`/ufficio?stato=tutte&comune=${m.id}`} className="btn-sm">Apri</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panels">
        <div className="panel">
          <h2>Segnalazioni aperte da verificare</h2>
          {o.toVerify.length === 0 ? (
            <div className="empty">Nessuna segnalazione sospetta.</div>
          ) : (
            <div className="otable-wrap">
              <table className="otable">
                <tbody>
                  {o.toVerify.map((r) => (
                    <tr key={r.id}>
                      <td><Link href={`/ufficio/segnalazioni/${r.code}`} className="code">{r.code}</Link></td>
                      <td>{r.category.icon} {r.municipality?.name || '—'}</td>
                      <td className="muted">⚠️ {r.authenticity.map((a) => AUTH_LABEL[a] || a).join(', ')}</td>
                      <td><span className={`badge ${r.status}`}>{OFFICE_STATUS[r.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="panel">
          <h2>Cittadini più attivi · ultimi 7 giorni</h2>
          {o.mostActive.length === 0 ? (
            <div className="empty">Nessuna segnalazione negli ultimi 7 giorni.</div>
          ) : (
            <div className="otable-wrap">
              <table className="otable">
                <tbody>
                  {o.mostActive.map((u) => (
                    <tr key={u.id}>
                      <td>{u.firstName} {u.lastName}{u.isBanned && <span className="badge REJECTED" style={{ marginLeft: 6 }}>Bloccato</span>}</td>
                      <td className="muted">{u.email}</td>
                      <td><strong>{u.count}</strong> segnalazion{u.count === 1 ? 'e' : 'i'}</td>
                      <td><Link href={`/ufficio/cittadini?q=${encodeURIComponent(u.email)}`} className="btn-sm">Gestisci</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
