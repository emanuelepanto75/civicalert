'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const MESSAGES = {
  insecure:
    'Il GPS funziona solo con connessione sicura (https). Apri l’app dall’indirizzo https:// e verifica di aver installato il certificato CivicAlerts sul telefono.',
  unsupported: 'Questo browser non supporta la geolocalizzazione.',
  1: 'Permesso posizione negato. Abilitalo nelle impostazioni del browser per questo sito e riprova.',
  denied_ios:
    'Permesso posizione negato. Su iPhone: Impostazioni › Privacy e sicurezza › Localizzazione (attiva) › Siti web Safari › «Mentre usi l’app». Poi in Safari tocca «aA» accanto all’indirizzo › Impostazioni sito web › Posizione › Consenti, e premi Riprova.',
  denied_android:
    'Permesso posizione negato. Su Android: tocca il lucchetto (o ⓘ) accanto all’indirizzo › Autorizzazioni › Posizione › Consenti, e verifica che la Posizione del telefono sia attiva. Poi premi Riprova.',
  2: 'Posizione non disponibile. Attiva il GPS e riprova.',
  3: 'Il GPS non ha risposto in tempo. Spostati all’aperto e riprova.',
};

// Permesso negato: istruzioni diverse per iPhone/iPad e Android.
function errorMessage(err) {
  if (err.code === 1) {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return MESSAGES.denied_ios;
    if (/Android/.test(ua)) return MESSAGES.denied_android;
  }
  return MESSAGES[err.code] || err.message;
}

/**
 * Acquisisce la posizione del dispositivo (non modificabile dall'utente, RF-11).
 * Continua ad ascoltare per qualche secondo per migliorare la precisione.
 */
export function useGeolocation() {
  const [state, setState] = useState({ status: 'idle' });
  const watchId = useRef(null);

  const stop = useCallback(() => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }, []);

  const start = useCallback(() => {
    stop();
    if (!window.isSecureContext) return setState({ status: 'error', message: MESSAGES.insecure });
    if (!('geolocation' in navigator)) return setState({ status: 'error', message: MESSAGES.unsupported });
    setState({ status: 'loading' });
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setState((prev) =>
          prev.position && prev.position.accuracy <= accuracy
            ? prev
            : { status: 'ok', position: { latitude, longitude, accuracy } },
        );
        if (accuracy <= 15) stop();
      },
      (err) => {
        stop();
        setState((prev) => (prev.position ? prev : { status: 'error', message: errorMessage(err) }));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
    setTimeout(stop, 30000);
  }, [stop]);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  return { ...state, retry: start };
}
