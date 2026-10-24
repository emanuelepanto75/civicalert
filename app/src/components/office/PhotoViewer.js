'use client';

import { useEffect, useState } from 'react';

// Foto ingrandita a tutto schermo, con "Chiudi". Non apre una nuova pagina: nell'app
// installata sul telefono una pagina con la sola foto non ha il pulsante Indietro.
export default function PhotoViewer({ src, style }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Il tasto Indietro del telefono (o del browser) chiude la foto invece di lasciare la pagina
    history.pushState({ photo: true }, '');
    const onPop = () => setOpen(false);
    const onKey = (e) => e.key === 'Escape' && history.back();
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button type="button" className="photo-thumb" onClick={() => setOpen(true)} title="Ingrandisci la foto">
        <img src={src} alt="Foto della segnalazione" style={style} />
      </button>
      {open && (
        <div className="photo-viewer" role="dialog" aria-label="Foto della segnalazione" onClick={() => history.back()}>
          <img src={src} alt="Foto della segnalazione" onClick={(e) => e.stopPropagation()} />
          <button type="button" className="photo-close" onClick={(e) => { e.stopPropagation(); history.back(); }}>✕ Chiudi</button>
        </div>
      )}
    </>
  );
}
