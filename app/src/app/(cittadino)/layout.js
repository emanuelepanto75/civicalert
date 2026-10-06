import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { getCurrentUser, isStaff } from '@/lib/auth';

// Layout dell'app per i cittadini (pensato per il telefono).
export default async function CitizenLayout({ children }) {
  const user = await getCurrentUser();
  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="logo">
          <span className="logo-icon">🛡</span>
          <span>
            Civic<span>Alert</span>
          </span>
        </Link>
        <div className="topbar-right">
          {user && isStaff(user) && <Link href="/ufficio" style={{ marginRight: 12 }}>Ufficio</Link>}
          {user ? <Link href="/profilo">Ciao, {user.firstName}</Link> : <Link href="/accedi">Accedi</Link>}
        </div>
      </header>
      <main className="main">{children}</main>
      <BottomNav loggedIn={Boolean(user)} />
    </div>
  );
}
