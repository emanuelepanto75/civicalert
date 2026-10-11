import { config } from '@/lib/config';

export const metadata = { title: 'Privacy – CivicAlerts' };
export const dynamic = 'force-dynamic';

const VERSIONE = 'dell’11 ottobre 2026';

// Informativa ai sensi degli artt. 13 e 14 del Regolamento UE 2016/679 (GDPR).
// Titolare e indirizzo arrivano dal file .env (TITOLARE_NOME, TITOLARE_INDIRIZZO).
export default function PrivacyPage() {
  const { owner, address, email } = config.privacy;
  const { reportYears, inactiveAccountMonths, unverifiedAccountDays } = config.retention;
  const mail = <a href={`mailto:${email}`}>{email}</a>;

  return (
    <div className="page">
      <div>
        <h1>Informativa privacy</h1>
        <p className="lead" style={{ marginTop: 4 }}>Versione {VERSIONE}</p>
      </div>
      <div className="card">
        <div className="card-body privacy-text">
          <p>
            Questa informativa spiega come CivicAlerts tratta i dati personali di chi usa l’app per segnalare
            problemi del territorio ai Comuni (Regolamento UE 2016/679, “GDPR”).
          </p>

          <h2>1. Titolare del trattamento</h2>
          <p>
            {owner || 'Titolare del servizio CivicAlerts'}
            {address && <>, {address}</>}. Per qualunque richiesta sui tuoi dati: {mail}.
          </p>

          <h2>2. Quali dati trattiamo</h2>
          <ul>
            <li><strong>Account</strong>: nome, cognome, email, numero di telefono, password (conservata solo in forma cifrata), data di accettazione dell’informativa e dell’ultimo accesso.</li>
            <li><strong>Segnalazioni</strong>: foto o video, posizione GPS e sua precisione, indirizzo ricavato dalla posizione, categoria, descrizione, data e ora, stato e storico della segnalazione. Dalle foto vengono rimossi i metadati (modello del telefono, coordinate); i video sono conservati come vengono inviati.</li>
            <li><strong>Dati tecnici</strong>: un cookie tecnico di sessione per mantenerti collegato (nessun cookie di profilazione o pubblicità) e registri tecnici del server, usati per sicurezza e per risolvere malfunzionamenti.</li>
          </ul>

          <h2>3. Perché li trattiamo e su quale base</h2>
          <ul>
            <li><strong>Fornirti il servizio</strong>: creare il tuo account, inoltrare le segnalazioni al Comune competente tramite PEC e informarti via email sul loro stato. Base giuridica: esecuzione del servizio che richiedi (art. 6.1.b GDPR).</li>
            <li><strong>Sicurezza ed esclusione degli abusi</strong>: limite di segnalazioni giornaliere, blocco dopo tentativi di accesso errati, controlli di autenticità delle foto, blocco degli account che abusano del servizio. Base giuridica: legittimo interesse del titolare a un servizio affidabile (art. 6.1.f).</li>
            <li><strong>Mappa ed elenco pubblici</strong>: chiunque può vedere categoria, posizione, indirizzo, foto, descrizione, data e stato delle segnalazioni, <strong>mai</strong> nome, email o telefono di chi le ha fatte. Base giuridica: legittimo interesse alla trasparenza sui problemi del territorio (art. 6.1.f); puoi opporti scrivendo a {mail}.</li>
            <li><strong>Obblighi di legge</strong> e difesa di un diritto in giudizio, quando necessario (art. 6.1.c e 6.1.f).</li>
          </ul>
          <p>
            Nome, email e telefono sono necessari: senza non è possibile inviare una segnalazione al Comune, che
            deve poterti ricontattare.
          </p>

          <h2>4. A chi vengono comunicati</h2>
          <ul>
            <li><strong>Il Comune competente</strong> per la zona della segnalazione riceve via PEC la segnalazione con nome, cognome, email e telefono. Da quel momento il Comune tratta i dati come titolare autonomo, secondo le proprie regole.</li>
            <li><strong>Fornitori tecnici</strong> che trattano i dati per conto del titolare: Aruba S.p.A. (caselle email e PEC; in futuro anche il server), e il servizio di mappe e ricerca indirizzi di OpenStreetMap, che riceve le coordinate della segnalazione ma non i tuoi dati di contatto.</li>
            <li>I dati non vengono venduti né usati per pubblicità.</li>
          </ul>

          <h2>5. Dove sono conservati</h2>
          <p>
            Su un server situato in Italia gestito dal titolare; in futuro presso Aruba, in Italia. I servizi di
            OpenStreetMap sono gestiti dalla OpenStreetMap Foundation nel Regno Unito, paese per cui la Commissione
            europea ha riconosciuto un livello di protezione adeguato.
          </p>

          <h2>6. Per quanto tempo</h2>
          <ul>
            <li><strong>Segnalazioni, foto e video</strong>: {reportYears} anni dall’ultimo aggiornamento (di solito la chiusura), poi vengono cancellati.</li>
            <li><strong>Account</strong>: cancellato dopo {inactiveAccountMonths} mesi senza accessi, se non hai segnalazioni ancora aperte. Le tue segnalazioni restano, senza dati che ti identificano, fino alla loro scadenza.</li>
            <li><strong>Registrazioni non confermate</strong>: cancellate dopo {unverifiedAccountDays} giorni.</li>
            <li>Puoi cancellare il tuo account in ogni momento dalla pagina Profilo.</li>
            <li>Le PEC già inviate al Comune restano negli archivi del Comune secondo le sue regole.</li>
          </ul>

          <h2>7. I tuoi diritti</h2>
          <p>
            Puoi chiedere l’accesso ai tuoi dati, la rettifica, la cancellazione, la limitazione del trattamento e
            la portabilità, e opporti ai trattamenti basati sul legittimo interesse, scrivendo a {mail}. Rispondiamo
            entro 30 giorni. Puoi anche presentare reclamo al Garante per la protezione dei dati personali
            (<a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer">garanteprivacy.it</a>).
          </p>

          <h2>8. Età minima</h2>
          <p>Per registrarti devi avere almeno 14 anni.</p>

          <h2>9. Cosa non mettere nelle segnalazioni</h2>
          <p>
            Foto, video e descrizione sono visibili a tutti. Non inquadrare volti, targhe o altri dati di persone e
            non scrivere nella descrizione nomi o informazioni personali, tue o di altri. Le segnalazioni che li
            contengono possono essere oscurate o rimosse.
          </p>

          <h2>10. Modifiche</h2>
          <p>
            Questa informativa può essere aggiornata; la data in alto indica la versione in vigore. In caso di
            modifiche importanti te lo comunicheremo via email.
          </p>
        </div>
      </div>
    </div>
  );
}
