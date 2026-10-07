import Link from 'next/link';
import LogoutButton from '@/components/office/LogoutButton';
import { requireStaffPage } from '@/lib/office';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Ufficio segnalazioni – CivicAlerts' };

// Layout del cruscotto per gli uffici comunali (pensato per il computer).
export default async function OfficeLayout({ children }) {
  const user = await requireStaffPage();
  const municipality = user.municipalityId
    ? await prisma.municipality.findUnique({ where: { id: user.municipalityId } })
    : null;
  return (
    <div className="office">
      <header className="office-top">
        <Link href="/ufficio" className="logo">
          <span className="logo-icon">🛡</span>
          <span>
            Civic<span>Alerts</span>
            <span className="logo-sub">Ufficio segnalazioni</span>
          </span>
        </Link>
        <nav className="office-nav">
          <Link href="/ufficio">Cruscotto</Link>
          {user.role === 'ADMIN' && (
            <>
              <Link href="/ufficio/amministrazione">Panoramica</Link>
              <Link href="/ufficio/cittadini">Cittadini</Link>
              <Link href="/ufficio/operatori">Operatori</Link>
              <Link href="/ufficio/pec">Invii PEC</Link>
            </>
          )}
          <Link href="/">App cittadini</Link>
        </nav>
        <div className="office-user">
          <span>
            {user.firstName} {user.lastName}
            {municipality ? ` · Comune di ${municipality.name}` : user.role === 'ADMIN' ? ' · Amministratore' : ''}
          </span>
          <LogoutButton />
        </div>
      </header>
      <main className="office-main">{children}</main>
    </div>
  );
}
