import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { publicReport } from '@/lib/reports';
import ResolveButton from './ResolveButton';

export const dynamic = 'force-dynamic';

const fmt = (d) =>
  new Date(d).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'medium', timeStyle: 'short' });

export default async function ReportDetailPage({ params }) {
  const { code } = await params;
  const raw = await prisma.report.findUnique({
    where: { code },
    include: { category: true, municipality: true, deliveries: true },
  });
  if (!raw) notFound();
  const user = await getCurrentUser();
  const isOwner = Boolean(user && raw.userId === user.id);
  const r = publicReport(raw, { includeOwner: isOwner, viewerId: user?.id });
  const open = !['RESOLVED', 'REJECTED'].includes(r.status);

  return (
    <div className="page">
      <div className="card">
        {r.mediaType === 'PHOTO' && <img className="detail-media" src={r.mediaUrl} alt="Foto della segnalazione" />}
        {r.mediaType === 'VIDEO' && <video className="detail-media" src={r.mediaUrl} controls playsInline />}
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            <h1 style={{ fontSize: 19 }}>{r.category.icon} {r.category.name}</h1>
            <span className={`badge ${r.status}`}>{r.statusLabel}</span>
          </div>
          <div className="kv"><span className="k">Numero</span><span className="v" style={{ fontFamily: 'monospace' }}>{r.code}</span></div>
          <div className="kv"><span className="k">Data</span><span className="v">{fmt(r.createdAt)}</span></div>
          <div className="kv"><span className="k">Posizione</span><span className="v">{r.address || '—'}</span></div>
          <div className="kv">
            <span className="k">Coordinate</span>
            <span className="v">
              <a href={`https://www.openstreetmap.org/?mlat=${r.latitude}&mlon=${r.longitude}#map=19/${r.latitude}/${r.longitude}`} target="_blank" rel="noreferrer">
                {r.latitude.toFixed(6)}, {r.longitude.toFixed(6)}
              </a>
            </span>
          </div>
          {r.municipality && <div className="kv"><span className="k">Comune</span><span className="v">{r.municipality}</span></div>}
          {r.description && <div className="kv"><span className="k">Descrizione</span><span className="v">{r.description}</span></div>}
          {r.resolvedAt && (
            <div className="kv">
              <span className="k">Chiusa il</span>
              <span className="v">{fmt(r.resolvedAt)} {r.resolvedBy === 'CITIZEN' ? '(confermata dal cittadino)' : '(dal Comune)'}</span>
            </div>
          )}
        </div>
      </div>

      {isOwner && r.deliveries?.length > 0 && (
        <div className="card">
          <div className="card-body">
            <div className="steps-label">Invii al Comune</div>
            {r.deliveries.map((d, i) => (
              <div key={i} className={`alert ${d.status === 'SENT' ? 'ok' : d.status === 'FAILED' ? 'error' : 'info'}`}>
                📨 {d.channel} a {d.recipient}
                <br />
                <span className="small">
                  {d.status === 'SENT' && `Inviata il ${fmt(d.sentAt)}`}
                  {d.status === 'PENDING' && `In invio (tentativi: ${d.attempts})`}
                  {d.status === 'FAILED' && 'Invio non riuscito dopo 3 tentativi'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isOwner && open && <ResolveButton code={r.code} />}
    </div>
  );
}
