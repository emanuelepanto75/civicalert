'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav({ loggedIn }) {
  const pathname = usePathname();
  const items = [
    { href: '/', icon: '🗺️', label: 'Mappa' },
    { href: '/segnalazioni', icon: '🏛️', label: 'Comuni' },
    { href: '/segnala', icon: '📍', label: 'Segnala' },
    { href: '/le-mie', icon: '📋', label: 'Le mie' },
    loggedIn ? { href: '/profilo', icon: '👤', label: 'Profilo' } : { href: '/accedi', icon: '🔑', label: 'Accedi' },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-item ${pathname === item.href ? 'active' : ''}`}
        >
          <span className="icon">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
