import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { mediaUrl } from '@/lib/media';
import { OFFICE_STATUS, findScopedReport, requireStaffPage } from '@/lib/office';
import ApprovalActions from '@/components/office/ApprovalActions';
import DeleteReport from '@/components/office/DeleteReport';
import PecEditor from '@/components/office/PecEditor';
import ProtocolEdit from '@/components/office/ProtocolEdit';
import { pecRecipientFor } from '@/lib/approval';
import StatusPanel from './StatusPanel';
import NoteForm from './NoteForm';
import PhotoViewer from '@/components/office/PhotoViewer';

export const dynamic = 'force-dynamic';

const fmt = (d) => new Date(d).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'medium', timeStyle: 'short' });

const FLAG_LABELS = {
  FOTO_SCATTATA_ALTROVE: 'La foto risulta scattata a più di 1 km dalla posizione segnalata',
  FOTO_VECCHIA: 'La foto risulta scattata più di 7 giorni prima della segnalazione',
  GPS_IMPRECISO: 'Posizione GPS poco precisa (oltre 100 m)',
};

// Nello storico l'approvazione porta allo stato "ricevuta" solo per un istante, prima dell'invio della PEC
const eventStatusLabel = (e) =>
  e.fromStatus === 'REVIEW' && e.toStatus === 'PENDING' ? 'Approvata, PEC al Comune' : OFFICE_STATUS[e.toStatus];
// Note scritte dall'app (es. risposte lette dalla casella PEC), senza autore
const autoEvent = (e) => !e.actor && e.kind === 'NOTE' && /^PEC /.test(e.note || '');

export default async function OfficeReportPage({ params }) {
  const { code } = await params;
  const user = await requireStaffPage(`/ufficio/segnalazioni/${code}`);
  const report = await findScopedReport(user, code);
  if (!report) notFound();
  const inbound = await prisma.inboundMessage.findMany({ where: { reportId: report.id }, orderBy: { receivedAt: 'desc' } });
  const events = await prisma.reportEvent.findMany({
    where: { reportId: report.id },
    orderBy: { createdAt: 'desc' },
    include: { actor: true },
  });
  const media = mediaUrl(report.mediaPath);
  const osm = `https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=19/${report.latitude}/${report.longitude}`;

  return (
    <>
      <div className="office-head">
        <div>
          <Link href="/ufficio" className="muted" style={{ fontSize: 14 }}>← Torna all’elenco</Link>
          <h1 style={{ marginTop: 6 }}>
            {report.category.icon} {report.category.name}{' '}
            <span className="code" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 20, color: 'var(--muted)' }}>{report.code}</span>
          </h1>
          <div className="sub">{report.address || 'Indirizzo non disponibile'} · ricevuta il {fmt(report.createdAt)}</div>
        </div>
        <span className={`badge ${report.status}`} style={{ fontSize: 14, padding: '6px 14px' }}>{OFFICE_STATUS[report.status]}</span>
      </div>

      <div className="detail-grid">
        <div className="col">
          {media && (
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              {report.mediaType === 'VIDEO' ? (
                <video src={media} controls playsInline style={{ width: '100%', display: 'block', maxHeight: 460, background: '#000' }} />
              ) : (
                <PhotoViewer src={media} style={{ width: '100%', display: 'block', maxHeight: 460, objectFit: 'contain', background: '#000' }} />
              )}
            </div>
          )}
          <div className="panel">
            <h2>Dettagli</h2>
            <dl className="facts">
              <dt>Descrizione</dt><dd>{report.description || '—'}</dd>
              <dt>Posizione</dt>
              <dd>
                <a href={osm} target="_blank" rel="noreferrer">{report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}</a>
                {report.gpsAccuracyM != null && <span className="muted"> · precisione ±{Math.round(report.gpsAccuracyM)} m</span>}
                <div className="muted">
                  {report.locationSource === 'PHOTO'
                    ? `Posizione del luogo dello scatto (GPS della foto)${report.photoTakenAt ? `, foto del ${new Date(report.photoTakenAt).toLocaleString('it-IT', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })}` : ''}`
                    : 'Posizione del telefono al momento dell’invio'}
                </div>
              </dd>
              <dt>Comune</dt><dd>{report.municipality?.name || 'non identificato'}</dd>
              {report.duplicateOf && (
                <>
                  <dt>Stesso problema</dt>
                  <dd>
                    già segnalato con{' '}
                    <Link href={`/ufficio/segnalazioni/${report.duplicateOf.code}`} className="code">{report.duplicateOf.code}</Link>{' '}
                    il {fmt(report.duplicateOf.createdAt)}
                  </dd>
                </>
              )}
              {report.duplicates.length > 0 && (
                <>
                  <dt>Segnalato anche da</dt>
                  <dd>
                    {report.duplicates.length} altr{report.duplicates.length === 1 ? 'o cittadino' : 'i cittadini'}:{' '}
                    {report.duplicates.map((d, i) => (
                      <span key={d.code}>
                        {i > 0 && ', '}
                        <Link href={`/ufficio/segnalazioni/${d.code}`} className="code">{d.code}</Link>
                      </span>
                    ))}
                    <div className="muted">Cambiando lo stato qui si aggiornano anche queste e i cittadini vengono avvisati.</div>
                  </dd>
                </>
              )}
              <dt>Segnalante</dt>
              <dd>
                {report.anonymous && user.role !== 'ADMIN' ? (
                  'Anonimo, su richiesta del cittadino'
                ) : report.user ? (
                  <>
                    {report.anonymous && <><span className="badge">Anonima: dati non inviati al Comune</span><br /></>}
                    {report.user.firstName} {report.user.lastName}<br />
                    <a href={`mailto:${report.user.email}`}>{report.user.email}</a>
                    {report.user.phone && <> · <a href={`tel:${report.user.phone}`}>{report.user.phone}</a></>}
                  </>
                ) : 'utente rimosso'}
              </dd>
              <dt>Protocollo del Comune</dt>
              <dd><ProtocolEdit code={report.code} number={report.protocolNumber} date={report.protocolDate} /></dd>
              <dt>Invio PEC</dt>
              <dd>
                {report.deliveries.length === 0
                  ? report.status === 'REVIEW'
                    ? 'Parte dopo l’approvazione'
                    : 'Nessun invio (Comune senza PEC configurata)'
                  : report.deliveries.map((d) => (
                      <div key={d.id}>
                        {d.status === 'SENT' ? `✅ Inviata il ${fmt(d.sentAt)}` : d.status === 'FAILED' ? '❌ Invio non riuscito' : '⏳ In invio'} a {d.recipient}
                        {d.deliveredAt && <div className="muted">📬 Consegnata nella casella del Comune il {fmt(d.deliveredAt)} (ricevuta PEC)</div>}
                        {d.status === 'SENT' && d.lastError && <div style={{ color: '#991b1b' }}>⚠️ {d.lastError}</div>}
                      </div>
                    ))}
              </dd>
            </dl>
            {report.authenticity.length > 0 && (
              <div className="alert warn" style={{ marginTop: 14 }}>
                <strong>Da verificare:</strong>
                <ul style={{ margin: '4px 0 0 18px' }}>
                  {report.authenticity.map((f) => <li key={f}>{FLAG_LABELS[f] || f}</li>)}
                </ul>
              </div>
            )}
          </div>
          {inbound.length > 0 && (
            <div className="panel">
              <h2>PEC ricevute dal Comune</h2>
              {inbound.map((m) => (
                <details key={m.id} style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
                  <summary style={{ cursor: 'pointer' }}>
                    <strong>{fmt(m.receivedAt)}</strong> · {m.fromAddress || 'mittente sconosciuto'}
                    {m.protocolNumber && <> · <span className="badge SENT">prot. {m.protocolNumber}</span></>}
                    <div className="muted small">{m.subject}</div>
                  </summary>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, marginTop: 8, maxHeight: 360, overflow: 'auto' }}>{m.text}</div>
                </details>
              ))}
            </div>
          )}
          {user.role === 'ADMIN' && <PecEditor code={report.code} />}
        </div>

        <div className="col">
          {report.status === 'REVIEW' ? (
            <div className="panel">
              <h2>Da approvare</h2>
              <p className="muted small">La PEC al Comune parte solo dopo l’approvazione.</p>
              <ApprovalActions code={report.code} hasPec={Boolean(pecRecipientFor(report))} />
            </div>
          ) : (
            <StatusPanel code={report.code} status={report.status} hasCitizen={Boolean(report.user)} />
          )}
          {user.role === 'ADMIN' && (
            <DeleteReport code={report.code} sent={report.deliveries.some((d) => d.status === 'SENT')} hidden={report.hiddenFromPublic} />
          )}
          <div className="panel">
            <h2>Storico</h2>
            <NoteForm code={report.code} />
            <div className="timeline" style={{ marginTop: 14 }}>
              {events.map((e) => (
                <div key={e.id} className={`tl-item ${e.kind === 'NOTE' ? 'note' : ''}`}>
                  <div className="when">
                    {fmt(e.createdAt)} · {e.actor ? `${e.actor.firstName} ${e.actor.lastName}` : autoEvent(e) ? 'CivicAlerts (automatico)' : 'utente rimosso'}
                    {e.kind === 'NOTE' && !autoEvent(e) && ' · nota interna'}
                    {e.kind === 'STATUS' && e.visibleToCitizen && ' · cittadino avvisato'}
                  </div>
                  {e.kind === 'STATUS' && (
                    <div>Stato: <span className={`badge ${e.toStatus}`}>{eventStatusLabel(e)}</span></div>
                  )}
                  {e.note && <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>{e.note}</div>}
                </div>
              ))}
              <div className="tl-item">
                <div className="when">{fmt(report.createdAt)}</div>
                <div>Segnalazione ricevuta</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
