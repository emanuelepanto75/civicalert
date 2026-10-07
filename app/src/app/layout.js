import 'leaflet/dist/leaflet.css';
import './globals.css';
import ServiceWorker from '@/components/ServiceWorker';

export const metadata = {
  title: 'CivicAlerts',
  description: 'Segnala buche, rifiuti e problemi stradali al tuo Comune via PEC.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'CivicAlerts', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
};

export const viewport = {
  themeColor: '#1A3A6B',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
