'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const MESSAGES = {
  insecure:
    'Il GPS funziona solo con connessione sicura (https). Apri l’app dall’indirizzo https:// e verifica di aver installato il certificato CivicAlerts sul telefono.',
  unsupported: 'Questo browser non supporta la geolocalizzazione.',
  1: 'Permesso posizione negato. Abilitalo nelle impostazioni del browser per questo sito e riprova.',
  2: 'Posizione non disponibile. Attiva il GPS e riprova.',
  3: 'Il GPS non ha risposto in tempo. Spostati all’aperto e riprova.',
};

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
        setState((prev) => (prev.position ? prev : { status: 'error', message: MESSAGES[err.code] || err.message }));
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
