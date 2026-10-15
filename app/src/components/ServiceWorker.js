'use client';

import { useEffect } from 'react';

// Registra il service worker (necessario per installare l'app sulla home).
export default function ServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
