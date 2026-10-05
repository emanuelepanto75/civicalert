import 'leaflet/dist/leaflet.css';
import './globals.css';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import ServiceWorker from '@/components/ServiceWorker';
import { getCurrentUser } from '@/lib/auth';

export const metadata = {
  title: 'CivicAlert',
  description: 'Segnala buche, rifiuti e problemi stradali al tuo Comune via PEC.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'CivicAlert', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
};

export const viewport = {
  themeColor: '#1A3A6B',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }) {
  const user = await getCurrentUser();
  return (
    <html lang="it">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link href="/" className="logo">
              <span className="logo-icon">🛡</span>
              <span>
                Civic<span>Alert</span>
              </span>
            </Link>
            <div className="topbar-right">
              {user ? <Link href="/profilo">Ciao, {user.firstName}</Link> : <Link href="/accedi">Accedi</Link>}
            </div>
          </header>
          <main className="main">{children}</main>
          <BottomNav loggedIn={Boolean(user)} />
        </div>
        <ServiceWorker />
      </body>
    </html>
  );
}
