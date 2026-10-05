import Link from 'next/link';
import ReportsMap from '@/components/ReportsMap';

export default function HomePage() {
  return (
    <div className="map-wrap">
      <ReportsMap />
      <Link href="/segnala" className="fab" aria-label="Nuova segnalazione">+</Link>
    </div>
  );
}
