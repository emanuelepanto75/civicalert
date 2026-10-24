import { config } from '@/lib/config';

export const metadata = { title: 'Privacy e cookie – CivicAlerts' };
export const dynamic = 'force-dynamic';

const VERSIONE = 'del 19 ottobre 2026';

// Informativa ai sensi degli artt. 13 e 14 del Regolamento UE 2016/679 (GDPR), testo rivisto dal legale.
// Titolare, DPO e indirizzi arrivano dal file .env (TITOLARE_NOME, PRIVACY_EMAIL, DPO_NOME, DPO_EMAIL).
export default function PrivacyPage() {
  const { owner, address, email, dpoName, dpoEmail } = config.privacy;
  const { reportYears, inactiveAccountMonths, unverifiedAccountDays } = config.retention;
  const mail = <a href={`mailto:${email}`}>{email}</a>;
  const sessionDays = Math.round(config.sessionHours / 24);

  return (
    <div className="page">
      <div>
        <h1>Informativa privacy e cookie</h1>
        <p className="lead" style={{ marginTop: 4 }}>Versione {VERSIONE}</p>
      </div>
      <div className="card">
        <div className="card-body privacy-text">
          <p>
            Questa informativa spiega come vengono trattati i dati personali di chi usa CivicAlerts per segnalare
            problemi del territorio (buche, lampioni spenti, rifiuti abbandonati) agli Enti Locali. È resa ai sensi
            degli articoli 13 e 14 del Regolamento (UE) 2016/679 («GDPR») e del Codice in materia di protezione dei
            dati personali (D.Lgs. 196/2003, come modificato dal D.Lgs. 101/2018).
          </p>

          <h2>1. Chi è il titolare del trattamento</h2>
          <p>
            Il titolare è {owner || 'il titolare del servizio CivicAlerts'}
            {address && <>, {address}</>}. Per qualunque domanda o richiesta sui tuoi dati puoi scrivere a {mail}.
          </p>
          {dpoName && (
            <p>
              Il titolare ha nominato un Responsabile della protezione dei dati (RPD/DPO), {dpoName}, che può essere
              contattato all’indirizzo <a href={`mailto:${dpoEmail}`}>{dpoEmail}</a>.
            </p>
          )}

          <h2>2. Quali dati trattiamo</h2>
          <ul>
            <li><strong>Dati dell’account</strong>: nome, cognome, email, numero di telefono, password (conservata solo in forma cifrata), dichiarazione di avere almeno 18 anni, data di accettazione dell’informativa e data dell’ultimo accesso.</li>
            <li><strong>Dati delle segnalazioni</strong>: foto o video, posizione GPS e relativa precisione, indirizzo ricavato dalla posizione, categoria, descrizione, data e ora, stato e storico della segnalazione.</li>
            <li><strong>Metadati dei file</strong>: dalle foto rimuoviamo automaticamente i metadati (ad esempio modello del telefono e coordinate). I video invece sono conservati così come li invii e possono contenere questi metadati: se preferisci non condividerli, usa una foto.</li>
            <li><strong>Dati tecnici</strong>: indirizzo IP, data e ora delle richieste e informazioni sul dispositivo e sul browser registrati nei log del server, oltre a un cookie tecnico di sessione (vedi il punto 9).</li>
            <li><strong>Dati di altre persone</strong>: foto, video e descrizioni potrebbero contenere, anche involontariamente, dati di terzi (volti, targhe, nomi). Vedi i punti 10 e 11.</li>
          </ul>

          <h2>3. Perché trattiamo i dati e su quale base giuridica</h2>
          <div className="table-scroll">
            <table className="privacy-table">
              <thead>
                <tr><th>Finalità</th><th>Base giuridica</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Fornirti il servizio</strong>: creare e gestire il tuo account, inoltrare la segnalazione via PEC al Comune competente insieme ai tuoi dati di contatto, aggiornarti via email sullo stato della segnalazione.</td>
                  <td>Esecuzione del servizio che hai richiesto (art. 6.1.b GDPR). Non ti chiediamo un consenso, perché l’invio al Comune è proprio ciò che chiedi usando l’app.</td>
                </tr>
                <tr>
                  <td><strong>Sicurezza e prevenzione degli abusi</strong>: limite di segnalazioni giornaliere, blocco temporaneo dopo ripetuti accessi errati, controlli di autenticità delle foto, sospensione degli account che usano il servizio in modo improprio.</td>
                  <td>Legittimo interesse del titolare a offrire un servizio affidabile e protetto (art. 6.1.f GDPR).</td>
                </tr>
                <tr>
                  <td><strong>Mappa ed elenco pubblici</strong>: pubblicare categoria, posizione, indirizzo, foto, video, descrizione, data e stato delle segnalazioni. Non vengono mai pubblicati nome, cognome, email o telefono di chi segnala.</td>
                  <td>Legittimo interesse alla trasparenza sui problemi del territorio e sulla loro gestione (art. 6.1.f GDPR). Puoi opporti in qualsiasi momento (punto 7).</td>
                </tr>
                <tr>
                  <td><strong>Obblighi di legge e tutela dei diritti</strong>: rispondere a richieste delle autorità, accertare, esercitare o difendere un diritto in giudizio.</td>
                  <td>Obbligo legale (art. 6.1.c GDPR) e legittimo interesse (art. 6.1.f GDPR).</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong>Dati obbligatori.</strong> Nome, cognome, email e telefono sono necessari: il Comune deve poterti
            ricontattare, e senza questi dati non è possibile inviare la segnalazione.
          </p>
          <p>
            <strong>Decisioni automatizzate.</strong> Non prendiamo decisioni basate unicamente su trattamenti
            automatizzati che producano effetti giuridici o incidano in modo analogo significativamente su di te
            (art. 22 GDPR). Se il tuo account viene limitato o sospeso puoi chiedere spiegazioni e una verifica da
            parte di una persona scrivendo a {mail}.
          </p>

          <h2>4. A chi comunichiamo i dati</h2>
          <ul>
            <li><strong>Il Comune competente</strong> per la zona della segnalazione riceve via PEC la segnalazione con nome, cognome, email e telefono. Da quel momento il Comune tratta i dati come titolare autonomo, per gestire la segnalazione e secondo la propria informativa privacy.</li>
            <li><strong>Aruba S.p.A.</strong> fornisce le caselle email e PEC e tratta i dati per conto del titolare, come responsabile del trattamento nominato ai sensi dell’art. 28 GDPR.</li>
            <li><strong>OpenStreetMap Foundation</strong> fornisce le mappe e la ricerca degli indirizzi. Riceve le coordinate delle segnalazioni e, quando la mappa viene caricata sul tuo dispositivo, il tuo indirizzo IP; non riceve mai nome, email o telefono. Tratta questi dati come titolare autonomo, secondo la propria informativa (<a href="https://osmfoundation.org" target="_blank" rel="noreferrer">osmfoundation.org</a>).</li>
            <li><strong>Autorità pubbliche</strong> solo quando la legge lo impone.</li>
          </ul>
          <p>I dati non vengono venduti, ceduti a terzi per fini commerciali o usati per pubblicità.</p>

          <h2>5. Dove sono conservati i dati</h2>
          <p>
            I dati sono conservati su server situati in Italia. I servizi di OpenStreetMap sono gestiti dalla
            OpenStreetMap Foundation nel Regno Unito: il trasferimento è coperto dalla decisione di adeguatezza della
            Commissione europea per il Regno Unito (art. 45 GDPR), che riconosce un livello di protezione equivalente
            a quello dell’Unione europea.
          </p>

          <h2>6. Per quanto tempo conserviamo i dati</h2>
          <ul>
            <li><strong>Segnalazioni, foto e video</strong>: {reportYears} anni dall’ultimo aggiornamento della segnalazione (di solito la chiusura), poi vengono cancellati.</li>
            <li><strong>Account</strong>: cancellato dopo {inactiveAccountMonths} mesi senza accessi, se non hai segnalazioni ancora aperte. Le segnalazioni già inviate restano pubblicate senza alcun dato che ti identifichi, fino alla loro scadenza.</li>
            <li><strong>Registrazioni non confermate</strong>: cancellate dopo {unverifiedAccountDays} giorni.</li>
            <li><strong>Log tecnici del server</strong>: 6 mesi, salvo che servano per accertare un abuso o un incidente di sicurezza.</li>
            <li><strong>Cancellazione volontaria</strong>: puoi cancellare il tuo account in qualsiasi momento dalla pagina Profilo. Nome, cognome, email, telefono e password vengono cancellati subito.</li>
            <li><strong>PEC già inviate</strong>: restano negli archivi del Comune che le ha ricevute, secondo le regole di conservazione del Comune.</li>
          </ul>
          <p>
            Possiamo conservare più a lungo solo i dati strettamente necessari ad adempiere un obbligo di legge o a
            difendere un diritto in giudizio, per il tempo necessario a farlo.
          </p>

          <h2>7. I tuoi diritti</h2>
          <p>Puoi esercitare in qualsiasi momento i diritti previsti dagli articoli 15-22 del GDPR:</p>
          <ul>
            <li>accedere ai tuoi dati e riceverne una copia;</li>
            <li>chiederne la rettifica se sono inesatti o incompleti;</li>
            <li>chiederne la cancellazione;</li>
            <li>chiedere la limitazione del trattamento;</li>
            <li>ricevere i dati che ci hai fornito in un formato strutturato e leggibile da dispositivo automatico (portabilità);</li>
            <li>opporti ai trattamenti basati sul legittimo interesse, compresa la pubblicazione di una tua segnalazione sulla mappa: in questo caso la segnalazione viene tolta dalla mappa e dall’elenco pubblici, ma resta inviata al Comune.</li>
          </ul>
          <p>
            Per esercitarli scrivi a {mail}. Ti rispondiamo senza ritardo e comunque entro un mese; nei casi più
            complessi il termine può essere prorogato di altri due mesi, e in quel caso te lo comunichiamo entro il
            primo mese.
          </p>
          <p>
            Se ritieni che il trattamento violi la normativa puoi presentare reclamo al Garante per la protezione dei
            dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer">garanteprivacy.it</a>)
            oppure rivolgerti all’autorità giudiziaria.
          </p>

          <h2>8. Età minima</h2>
          <p>
            Per registrarti devi avere almeno 18 anni. Se scopriamo che un account appartiene a una persona più
            giovane, lo cancelliamo.
          </p>

          <h2>9. Cookie e tecnologie simili</h2>
          <p>
            CivicAlerts usa solo un cookie tecnico di sessione, indispensabile per mantenerti collegato dopo
            l’accesso. Non usiamo cookie di profilazione, di pubblicità o di analisi statistica, né cookie di terze
            parti.
          </p>
          <div className="table-scroll">
            <table className="privacy-table">
              <thead>
                <tr><th>Cookie</th><th>A cosa serve</th><th>Durata</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>civicalerts_session</code></td>
                  <td>Mantiene attiva la sessione dopo l’accesso</td>
                  <td>{sessionDays} giorni, oppure fino all’uscita (logout)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            I cookie tecnici non richiedono il tuo consenso (art. 122 del Codice privacy e Linee guida del Garante
            sui cookie del 10 giugno 2021): per questo l’app non mostra un banner cookie. Puoi comunque cancellarli
            dalle impostazioni del browser, ma senza il cookie di sessione non potrai restare collegato.
          </p>

          <h2>10. Cosa non inserire nelle segnalazioni</h2>
          <p>
            Foto, video e descrizioni sono visibili a tutti. Inquadra solo il problema: evita volti, targhe e altri
            elementi che permettano di riconoscere qualcuno, e non scrivere nella descrizione nomi o informazioni
            personali, tue o di altre persone. Le segnalazioni che li contengono possono essere oscurate o rimosse.
          </p>

          <h2>11. Se compari in una segnalazione</h2>
          <p>
            Se ritieni che una foto, un video o una descrizione pubblicati su CivicAlerts contengano tuoi dati
            personali (per esempio il tuo volto o la targa della tua auto), scrivi a {mail} indicando la
            segnalazione: provvederemo a oscurare o rimuovere il contenuto. Hai gli stessi diritti indicati al
            punto 7.
          </p>

          <h2>12. Sicurezza</h2>
          <p>
            Adottiamo misure tecniche e organizzative adeguate a proteggere i dati (art. 32 GDPR), tra cui la
            conservazione delle password solo in forma cifrata, il blocco degli accessi dopo ripetuti tentativi
            errati, la rimozione dei metadati dalle foto e l’invio delle segnalazioni tramite PEC. In caso di
            violazione dei dati che presenti un rischio per te, ti avviseremo come previsto dagli articoli 33 e 34
            del GDPR.
          </p>

          <h2>13. Modifiche a questa informativa</h2>
          <p>
            Questa informativa può essere aggiornata; la data in alto indica la versione in vigore. In caso di
            modifiche importanti te lo comunicheremo via email o con un avviso nell’app.
          </p>
        </div>
      </div>
    </div>
  );
}
