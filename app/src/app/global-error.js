'use client';

import ErrorScreen from '@/components/ErrorScreen';

// Errore nel layout principale: sostituisce l'intera pagina.
export default function GlobalError({ error }) {
  return (
    <html lang="it" translate="no">
      <body>
        <ErrorScreen error={error} reset={() => window.location.reload()} />
      </body>
    </html>
  );
}
