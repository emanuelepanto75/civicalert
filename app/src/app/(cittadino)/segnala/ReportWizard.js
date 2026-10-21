'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/components/api';
import { useGeolocation } from './useGeolocation';

const STEP_LABELS = ['Foto', 'Categoria', 'Invio'];

export default function ReportWizard({ categories, review }) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [categoryId, setCategoryId] = useState(null);
  const [description, setDescription] = useState('');
  const [result, setResult] = useState(null);
  const [photoInfo, setPhotoInfo] = useState(null);
  const geo = useGeolocation();

  // Posizione e ora dello scatto lette dalla foto (se il telefono le ha lasciate)
  useEffect(() => {
    setPhotoInfo(null);
    if (!file || !file.type.startsWith('image/')) return;
    let cancelled = false;
    const form = new FormData();
    form.append('media', file);
    api('/api/reports/photo-info', { body: form })
      .then((res) => !cancelled && setPhotoInfo(res))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Graffe obbligatorie: in Chrome recenti scrollTo restituisce una Promise, che
  // React scambierebbe per la funzione di pulizia dell'effetto (errore "u is not a function").
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  if (result) return <Success result={result} />;

  return (
    <>
      <div className="progress"><div style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
      <div className="page">
        <div className="steps-label">Passo {step + 1} di 3 · {STEP_LABELS[step]}</div>
        {review && step === 0 && <ReviewNotice />}
        {step === 0 && <PhotoStep file={file} preview={preview} setFile={setFile} onNext={() => setStep(1)} />}
        {step === 1 && (
          <CategoryStep
            categories={categories}
            categoryId={categoryId}
            setCategoryId={setCategoryId}
            description={description}
            setDescription={setDescription}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <ReviewStep
            file={file}
            preview={preview}
            category={categories.find((c) => c.id === categoryId)}
            description={description}
            geo={geo}
            photoInfo={photoInfo}
            review={review}
            onBack={() => setStep(1)}
            onDone={setResult}
          />
        )}
      </div>
    </>
  );
}

function MediaPreview({ file, preview, onRemove }) {
  if (!preview) return null;
  return (
    <div className="media-preview">
      {file.type.startsWith('video/') ? <video src={preview} controls playsInline /> : <img src={preview} alt="Anteprima" />}
      {onRemove && <button type="button" className="media-remove" onClick={onRemove} aria-label="Rimuovi">✕</button>}
    </div>
  );
}

function PhotoStep({ file, preview, setFile, onNext }) {
  const camera = useRef(null);
  const gallery = useRef(null);
  const video = useRef(null);
  const pick = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = '';
  };

  return (
    <>
      <div>
        <h1>Aggiungi una foto</h1>
        <p className="muted">Documenta il problema con un’immagine chiara o un breve video.</p>
        <p className="muted small" style={{ marginTop: 6 }}>Foto e descrizione saranno pubbliche: inquadra solo il problema, senza volti, targhe o nomi.</p>
      </div>

      {file ? (
        <MediaPreview file={file} preview={preview} onRemove={() => setFile(null)} />
      ) : (
        <button type="button" className="upload-zone" onClick={() => camera.current.click()}>
          <div className="big">📷</div>
          <strong>Tocca per scattare una foto</strong>
          <div className="muted small">Foto o video fino a 50 MB</div>
        </button>
      )}

      <div className="row compact">
        <button type="button" className="btn secondary" onClick={() => camera.current.click()}>📷 Foto</button>
        <button type="button" className="btn secondary" onClick={() => video.current.click()}>🎥 Video</button>
        <button type="button" className="btn secondary" onClick={() => gallery.current.click()}>🖼️ Galleria</button>
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
      <input ref={video} type="file" accept="video/*" capture="environment" hidden onChange={pick} />
      <input ref={gallery} type="file" accept="image/*,video/*" hidden onChange={pick} />

      <button type="button" className="btn" disabled={!file} onClick={onNext}>Continua →</button>
    </>
  );
}

function CategoryStep({ categories, categoryId, setCategoryId, description, setDescription, onBack, onNext }) {
  return (
    <>
      <div>
        <h1>Che problema è?</h1>
        <p className="muted">Seleziona la categoria.</p>
      </div>
      <div className="cat-list">
        {categories.map((c) => (
          <button type="button" key={c.id} className={`cat-item ${categoryId === c.id ? 'selected' : ''}`}
            onClick={() => setCategoryId(c.id)}>
            <span className="ico">{c.icon}</span>
            <span className="name">{c.name}</span>
            <span className="tick">✓</span>
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="desc">Descrizione <span className="muted">(facoltativa)</span></label>
        <textarea id="desc" maxLength={1000} rows={3} value={description}
          placeholder="Es. buca profonda circa 20 cm vicino all’incrocio, pericolosa per le bici…"
          onChange={(e) => setDescription(e.target.value)} />
        <div className="muted small" style={{ textAlign: 'right' }}>{description.length}/1000</div>
      </div>
      <div className="row">
        <button type="button" className="btn secondary" onClick={onBack}>← Indietro</button>
        <button type="button" className="btn" disabled={!categoryId} onClick={onNext}>Continua →</button>
      </div>
    </>
  );
}

function ReviewStep({ file, preview, category, description, geo, photoInfo, review, onBack, onDone }) {
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null); // 'photo' | 'device', scelto dal cittadino

  // Due posizioni possibili: dove è stata scattata la foto e dove si trova ora il telefono.
  // Se sono lontane (o il GPS del telefono non c'è) il cittadino sceglie quale usare.
  const device = geo.position;
  const photo = useMemo(
    () => (photoInfo?.gps ? { latitude: photoInfo.latitude, longitude: photoInfo.longitude } : null),
    [photoInfo],
  );
  const apart = photo && device ? distanceM(photo, device) : null;
  const needChoice = Boolean(photo && (!device || apart > SAME_PLACE_M));
  const useSource = needChoice ? source : 'device';
  const position = useSource === 'photo' ? photo : useSource === 'device' ? device : null;

  // Quando la posizione è disponibile (o migliora) chiede al server indirizzo,
  // comune competente e se esiste già una segnalazione uguale.
  useEffect(() => {
    setCheck(null);
    if (!position) return;
    let cancelled = false;
    setChecking(true);
    api('/api/reports/check', { body: { categoryId: category.id, ...position } })
      .then((res) => !cancelled && setCheck(res))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
  }, [position, category.id]);

  async function send() {
    setSending(true);
    setError(null);
    const form = new FormData();
    form.append('media', file);
    form.append('categoryId', category.id);
    form.append('description', description);
    form.append('latitude', position.latitude);
    form.append('longitude', position.longitude);
    if (position.accuracy != null) form.append('accuracy', position.accuracy);
    form.append('locationSource', useSource);
    try {
      onDone(await api('/api/reports', { body: form }));
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  const blocked = !position || !check || check.duplicate || check.reportsLeft <= 0 || check.accuracyTooLow;

  return (
    <>
      <div>
        <h1>Controlla e invia</h1>
        <p className="muted">Verifica i dettagli prima dell’invio.</p>
      </div>

      <div className="card">
        <MediaPreview file={file} preview={preview} />
        <div className="card-body">
          <div className="kv"><span className="k">Categoria</span><span className="v">{category.icon} {category.name}</span></div>
          {description && <div className="kv"><span className="k">Descrizione</span><span className="v">{description}</span></div>}
          <div className="divider" />

          {needChoice && (
            <LocationChoice photo={photoInfo} geo={geo} apart={apart} source={source} setSource={setSource} />
          )}
          {!needChoice && file.type.startsWith('image/') && photoInfo && !photoInfo.gps && (
            <div className="muted small">
              La foto non contiene la posizione dello scatto: verrà usata la posizione attuale del telefono. Se non sei sul
              posto, invia la segnalazione quando ci torni. Su iPhone, scegliendo dalla galleria, tocca «Opzioni» e attiva
              «Posizione».
            </div>
          )}
          <div className={`info-box ${position ? 'ok' : ''}`} style={needChoice && !position ? { display: 'none' } : undefined}>
            <span className="label">📡 {useSource === 'photo' ? 'Posizione della foto' : 'Posizione GPS'}</span>
            {geo.status === 'loading' && !position && <span className="value">⏳ Rilevamento posizione…</span>}
            {geo.status === 'error' && !position && (
              <>
                <span className="sub" style={{ color: '#991b1b' }}>{geo.message}</span>
                <button type="button" className="btn secondary" onClick={geo.retry}>Riprova</button>
              </>
            )}
            {position && (
              <>
                <span className="value">{check?.address || (checking ? 'Ricerca indirizzo…' : 'Posizione rilevata')}</span>
                <span className="sub">
                  {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                  {position.accuracy != null ? ` · precisione ±${Math.round(position.accuracy)} m` : ' · dal luogo dello scatto'}
                </span>
              </>
            )}
          </div>

          {check && (
            check.municipality ? (
              <div className={`info-box ${check.municipality.pec ? 'ok' : ''}`}>
                <span className="label">📨 Destinatario</span>
                <span className="value">🏛 Comune di {check.municipality.name} ({check.municipality.province})</span>
                <span className="sub">{check.municipality.pec || 'PEC non configurata: la segnalazione verrà solo registrata'}</span>
              </div>
            ) : (
              <div className="alert warn">
                {check.geocodingError
                  ? 'Non è stato possibile identificare il Comune (servizio indirizzi non raggiungibile).'
                  : 'Comune non identificato per questa posizione.'}{' '}
                La segnalazione verrà salvata ma non inviata automaticamente.
              </div>
            )
          )}
        </div>
      </div>

      {check?.accuracyTooLow && (
        <div className="alert warn">Posizione ancora imprecisa (±{Math.round(position.accuracy)} m). Attendi qualche secondo o spostati all’aperto.</div>
      )}
      {check?.duplicate && (
        <div className="alert warn">
          Hai già segnalato questo problema:{' '}
          <Link href={`/segnalazioni/${check.duplicate.code}`}>{check.duplicate.code}</Link>. Non serve inviarlo di nuovo.
        </div>
      )}
      {check?.sameProblem && (
        <div className="alert info">
          Questo problema risulta già segnalato{' '}
          {check.sameProblem.count === 1 ? 'da un altro cittadino' : `da ${check.sameProblem.count} cittadini`} dal{' '}
          {new Date(check.sameProblem.since).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' })} (
          <Link href={`/segnalazioni/${check.sameProblem.code}`}>{check.sameProblem.code}</Link>). Inviala comunque: il Comune
          riceverà anche la tua e saprà che non è un caso isolato.
        </div>
      )}
      {check && check.reportsLeft <= 0 && (
        <div className="alert warn">Hai raggiunto il numero massimo di segnalazioni per oggi. Riprova domani.</div>
      )}
      {error && <div className="alert error">{error}</div>}

      {review && <ReviewNotice />}
      <div className="alert info small">
        🛡️ La segnalazione sarà inviata al Comune tramite <strong>PEC</strong>, con ricevuta di consegna legalmente valida.
        Al Comune verranno comunicati nome, cognome, email e telefono; sulla mappa pubblica no.
      </div>

      <div className="row">
        <button type="button" className="btn secondary" onClick={onBack} disabled={sending}>← Indietro</button>
        <button type="button" className="btn accent" onClick={send} disabled={blocked || sending}>
          {sending ? <><span className="spinner" /> Invio…</> : 'Invia →'}
        </button>
      </div>
    </>
  );
}

// Fase iniziale: la segnalazione parte solo dopo l'approvazione dell'amministratore.
function ReviewNotice() {
  return (
    <div className="alert warn small">
      🕵️ <strong>Fase di avvio:</strong> ogni segnalazione viene controllata dall’amministratore di CivicAlerts e inviata
      al Comune di appartenenza <strong>solo dopo l’approvazione</strong>. Ti avviseremo via email appena verificata.
    </div>
  );
}

const SAME_PLACE_M = 150; // oltre questa distanza foto e telefono sono "posti diversi"

function distanceM(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(h));
}

const shotTime = (iso) =>
  new Date(iso).toLocaleString('it-IT', { timeZone: 'UTC', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// La foto è stata scattata altrove: il cittadino conferma dove si trova il problema.
function LocationChoice({ photo, geo, apart, source, setSource }) {
  const far = apart != null ? (apart >= 1000 ? `${(apart / 1000).toFixed(1)} km` : `${Math.round(apart)} m`) : null;
  return (
    <div className="info-box">
      <span className="label">📍 Dove si trova il problema?</span>
      <span className="sub">
        {far ? `La foto è stata scattata a ${far} da dove ti trovi ora.` : 'La foto contiene la posizione dello scatto.'} Scegli
        la posizione da inviare al Comune:
      </span>
      <label className="check" style={{ marginTop: 6 }}>
        <input type="radio" name="source" checked={source === 'photo'} onChange={() => setSource('photo')} />
        <span>
          <strong>📷 Dove ho scattato la foto</strong>
          {photo.takenAt && <> ({shotTime(photo.takenAt)})</>}
          <br />
          <span className="small muted">{photo.address || `${photo.latitude.toFixed(5)}, ${photo.longitude.toFixed(5)}`}</span>
        </span>
      </label>
      <label className="check">
        <input type="radio" name="source" checked={source === 'device'} disabled={!geo.position} onChange={() => setSource('device')} />
        <span>
          <strong>📱 Dove mi trovo adesso</strong>
          <br />
          <span className="small muted">
            {geo.position
              ? `${geo.position.latitude.toFixed(5)}, ${geo.position.longitude.toFixed(5)}`
              : geo.status === 'error' ? 'posizione del telefono non disponibile' : 'rilevamento…'}
          </span>
        </span>
      </label>
    </div>
  );
}

function Success({ result }) {
  const { report, routed, review } = result;
  const pec = report.deliveries?.[0];
  if (review) {
    return (
      <div className="page center">
        <div className="success-icon">✅</div>
        <div>
          <h1>Segnalazione registrata!</h1>
          <p className="muted">
            Ora è <strong>in verifica</strong>: dopo l’approvazione dell’amministratore verrà inviata via PEC
            {report.municipality ? ` al Comune di ${report.municipality}` : ' al Comune competente'}. Ti scriveremo via email.
          </p>
        </div>
        <div className="code-box">
          <div className="steps-label">Numero segnalazione</div>
          <div className="code">{report.code}</div>
          <div className="muted small">Conservalo come riferimento della tua segnalazione.</div>
        </div>
        <Link href={`/segnalazioni/${report.code}`} className="btn">Vedi la segnalazione</Link>
        <a href="/segnala" className="btn secondary">+ Nuova segnalazione</a>
      </div>
    );
  }
  return (
    <div className="page center">
      <div className="success-icon">✅</div>
      <div>
        <h1>Segnalazione registrata!</h1>
        <p className="muted">
          {routed
            ? pec?.status === 'SENT'
              ? `Inviata via PEC al Comune di ${report.municipality}.`
              : `L’invio della PEC al Comune di ${report.municipality} è in corso.`
            : 'Il tuo Comune non è ancora raggiungibile automaticamente: la segnalazione resta registrata.'}
        </p>
      </div>
      <div className="code-box">
        <div className="steps-label">Numero segnalazione</div>
        <div className="code">{report.code}</div>
        <div className="muted small">Conservalo come riferimento della tua segnalazione.</div>
      </div>
      {pec && (
        <div className={`alert ${pec.status === 'SENT' ? 'ok' : 'info'}`} style={{ textAlign: 'left' }}>
          📨 <strong>{pec.status === 'SENT' ? 'PEC inviata' : 'PEC in invio'}</strong> · {pec.recipient}
        </div>
      )}
      <Link href={`/segnalazioni/${report.code}`} className="btn">Vedi la segnalazione</Link>
      <a href="/segnala" className="btn secondary">+ Nuova segnalazione</a>
    </div>
  );
}
