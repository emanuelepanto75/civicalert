import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { publicReport } from '@/lib/reports';

export const metadata = { title: 'Le mie segnalazioni – CivicAlert' };
export const dynamic = 'force-dynamic';

export default async function MyReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/accedi?next=/le-mie');
  const reports = (
    await prisma.report.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { category: true, municipality: true },
    })
  ).map((r) => publicReport(r));

  return (
    <div className="page">
      <h1>Le mie segnalazioni</h1>
      {reports.length === 0 ? (
        <div className="card">
          <div className="card-body center">
            <div style={{ fontSize: 40 }}>📭</div>
            <p className="muted">Non hai ancora inviato segnalazioni.</p>
            <Link href="/segnala" className="btn accent">+ Nuova segnalazione</Link>
          </div>
        </div>
      ) : (
        <div className="card">
          {reports.map((r) => (
            <Link key={r.code} href={`/segnalazioni/${r.code}`} className="report-item">
              {r.mediaType === 'PHOTO' ? (
                <img className="report-thumb" src={r.mediaUrl} alt="" />
              ) : (
                <div className="report-thumb">{r.category.icon}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="title">{r.category.icon} {r.category.name}</div>
                <div className="meta">{r.address || r.municipality || 'Posizione GPS'}</div>
                <div className="meta">
                  {r.code} · {new Date(r.createdAt).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' })}
                </div>
                <span className={`badge ${r.status}`} style={{ marginTop: 6 }}>{r.statusLabel}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
