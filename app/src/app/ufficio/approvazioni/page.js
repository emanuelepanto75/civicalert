import Link from 'next/link';
import ApprovalActions from '@/components/office/ApprovalActions';
import ApprovalToggle from '@/components/office/ApprovalToggle';
import { requireAdminPage } from '@/lib/admin';
import { reportsToReview } from '@/lib/approval';
import { mediaUrl } from '@/lib/media';
import { approvalRequired } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Da approvare – CivicAlerts' };

const fmt = (d) => new Date(d).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'medium', timeStyle: 'short' });

const FLAG_LABELS = {
  FOTO_SCATTATA_ALTROVE: 'foto scattata a più di 1 km dal punto segnalato',
  FOTO_VECCHIA: 'foto di più di 7 giorni prima',
  GPS_IMPRECISO: 'posizione GPS poco precisa',
};

// Amministratore: segnalazioni in attesa di approvazione prima della PEC al Comune.
export default async function ApprovalsPage() {
  await requireAdminPage('/ufficio/approvazioni');
  const [enabled, reports] = await Promise.all([approvalRequired(), reportsToReview()]);

  return (
    <>
      <div className="office-head">
        <div>
          <h1>Da approvare</h1>
          <div className="sub">
            {reports.length === 0
              ? 'Nessuna segnalazione in attesa.'
              : `${reports.length} segnalazion${reports.length === 1 ? 'e' : 'i'} in attesa, dalla più vecchia.`}
          </div>
        </div>
      </div>

      <ApprovalToggle enabled={enabled} />

      {reports.map((r) => {
        const media = mediaUrl(r.mediaPath);
        const pec = r.municipality?.notifyPec ? r.municipality.pecAddress : null;
        return (
          <section key={r.id} className="panel" style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ width: 260, flexShrink: 0 }}>
              {media && r.mediaType === 'VIDEO' && (
                <video src={media} controls playsInline style={{ width: '100%', borderRadius: 10, background: '#000' }} />
              )}
              {media && r.mediaType !== 'VIDEO' && (
                <a href={media} target="_blank" rel="noreferrer">
                  <img src={media} alt="Foto della segnalazione" style={{ width: '100%', borderRadius: 10, display: 'block', objectFit: 'cover', maxHeight: 260 }} />
                </a>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <h2 style={{ margin: 0 }}>
                  {r.category.icon} {r.category.name}{' '}
                  <Link href={`/ufficio/segnalazioni/${r.code}`} className="code" style={{ fontSize: 15, fontWeight: 400 }}>{r.code}</Link>
                </h2>
                <div className="muted small">{fmt(r.createdAt)}</div>
              </div>
              <dl className="facts">
                <dt>Posizione</dt><dd>{r.address || `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`}</dd>
                <dt>Comune</dt>
                <dd>
                  {r.municipality?.name || 'non identificato'}
                  <span className="muted"> · {pec || 'nessuna PEC attiva: verrà solo registrata'}</span>
                </dd>
                <dt>Descrizione</dt><dd>{r.description || '—'}</dd>
                <dt>Segnalante</dt>
                <dd>
                  {r.user ? <>{r.user.firstName} {r.user.lastName} · <a href={`mailto:${r.user.email}`}>{r.user.email}</a></> : 'utente rimosso'}
                </dd>
                {r.duplicateOf && (
                  <>
                    <dt>Stesso problema</dt>
                    <dd>
                      già segnalato con <Link href={`/ufficio/segnalazioni/${r.duplicateOf.code}`} className="code">{r.duplicateOf.code}</Link> il {fmt(r.duplicateOf.createdAt)}
                    </dd>
                  </>
                )}
              </dl>
              {r.authenticity.length > 0 && (
                <div className="alert warn small">Da verificare: {r.authenticity.map((f) => FLAG_LABELS[f] || f).join('; ')}.</div>
              )}
              <ApprovalActions code={r.code} hasPec={Boolean(pec)} />
            </div>
          </section>
        );
      })}
    </>
  );
}
