# CivicAlerts – cose da fare

Elenco delle attività decise: prima quelle ancora da fare, in fondo quelle già fatte. Aggiornato il 24/10/2026.

## Da fare sul server di casa

- [ ] **Aggiornare l'app** con le ultime novità (lettura della casella PEC e protocollo):
      `git pull`, aggiungere `PEC_IMAP_HOST=imaps.pec.aruba.it` al `.env`, poi `docker compose up -d --build`.
- [ ] **Completare il `.env`**:
      - `PUBLIC_URL=https://app.civicalerts.it`
      - `TITOLARE_NOME` e `TITOLARE_INDIRIZZO` (informativa privacy)
      - `ALERT_EMAIL`, `ALERT_WHATSAPP_PHONE`, `ALERT_WHATSAPP_APIKEY`,
        `ALERT_DNS_HOSTS=civicalerts.it,app.civicalerts.it` (avviso se cambia l'indirizzo internet)
      Poi `docker compose up -d`.
- [ ] **Ripartenza automatica dopo un blackout** (guida: `INSTALLAZIONE_WINDOWS.md`, "Ripartenza automatica"):
      - [ ] Docker Desktop: "Start Docker Desktop when you sign in"
      - [ ] Autologon e sospensione del PC su "Mai"
      - [ ] Attività pianificata "Avvio CivicAlerts" (`scripts/avvio.ps1 -Blocca`), provata con `Start-ScheduledTask`
      - [ ] BIOS: "Restore on AC Power Loss" su Power On
      - [ ] Prova finale: riavvio senza toccare nulla, app raggiungibile dopo 5 minuti
- [ ] **Cambiare la password della casella PEC** su Aruba (è stata scritta in chat) e aggiornarla nel `.env`.
- [ ] **DNS Aruba, un solo record SPF**: oggi ce ne sono due (`v=spf1 include:_spf.aruba.it ~all` e
      `v=spf1 include:spf.aruba.it ~all`); con due le email di noreply@civicalerts.it possono finire nello spam.
      Cancellare quello con `spf.aruba.it` (senza trattino basso) e tenere `_spf.aruba.it`.
- [ ] **Verifica del dominio su Meta**: record TXT `facebook-domain-verification=…` aggiunto su Aruba il 19/10/2026;
      quando è visibile premere "Verifica dominio" in Business Suite › Sicurezza del brand › Domini.

## Prima di allargare le prove

- [x] **Informativa privacy definitiva** (testo del legale) inserita nella pagina Privacy e cookie il 19/10/2026:
      età minima 18 anni, DPO, tabella delle basi giuridiche e del cookie, testi brevi nelle schermate,
      "Togli dalla mappa pubblica" per l'amministratore.
- [x] **Caselle info@civicalerts.it e dpo@civicalerts.it** create su Aruba (20/10/2026).
- [ ] **Nel `.env`**: `TITOLARE_NOME` (e `TITOLARE_INDIRIZZO` se vuoi), `DPO_NOME`, poi `docker compose up -d`.
- [ ] **Log tecnici al massimo 6 mesi** (promesso dall'informativa): oggi i registri dei contenitori ruotano per
      dimensione (5 file da 10 MB); aggiungere una pulizia periodica, ad es. `docker compose up -d --force-recreate`
      una volta al mese nell'attività pianificata.
- [ ] **Informativa e segnalazioni anonime**: chiedere al legale se aggiungere che, con l'anonimato, nome, email e
      telefono non vengono comunicati al Comune e le sue risposte sono inoltrate da CivicAlerts.
- [ ] **Backup 30 giorni**: l'informativa definitiva non lo cita; chiedere al legale se aggiungerlo.
- [ ] **Avvio reale (19/10/2026)**: ultima prova completa con `PEC_OVERRIDE_TO` ancora attivo, poi cancellare
      utenti e segnalazioni di prova, togliere `PEC_OVERRIDE_TO` dal `.env` e `docker compose up -d`.
      Da quel momento le segnalazioni approvate dall'amministratore arrivano davvero ai Comuni
      (l'avviso "versione di prova" non serve più).
- [ ] **Indirizzo internet di casa che cambia** (TIM): passare la gestione DNS a Cloudflare con aggiornamento
      automatico, oppure usare il tunnel Cloudflare. Nel frattempo l'app avvisa via email/WhatsApp.

## Prossimi sviluppi brevi

- [ ] **Cancellazione anche delle proprie segnalazioni**: in "Elimina account" dare la scelta di cancellare
      anche segnalazioni e foto (oggi restano anonime; altrimenti serve una richiesta via email).
- [ ] **Annotare i canali ricevuti dai Comuni** (indirizzi, WhatsApp, gestori) nella pagina Comuni, in risposta
      alla nota nella PEC.
- [ ] **Pulsante "Condividi"** nella pagina della segnalazione: il cittadino sceglie se pubblicarla sui propri
      social (link alla pagina pubblica, nessun dato personale).
- [ ] **Avviso in autostrada / strada extraurbana**: "Segnala solo se sei passeggero; per pericoli immediati
      chiama il 112" e "la segnalazione andrà al Comune, che potrebbe inoltrarla al gestore".

## Sviluppi futuri

- [ ] **Instradamento all'ente competente** in base al tipo di strada (OpenStreetMap):
      autostrade A18/A20 → CAS (Consorzio Autostrade Siciliane); altre autostrade e strade statali → ANAS;
      strade provinciali → Città Metropolitana / Libero Consorzio; resto → Comune.
      Serve una tabella degli enti con le PEC e le regole di instradamento.
- [ ] **Indirizzo diverso per categoria** per ogni Comune (es. illuminazione → ditta che gestisce i lampioni),
      impostabile dalla pagina Comuni della dashboard.
- [ ] **Post periodici sulla pagina Facebook** con i numeri del mese, in tono positivo verso i Comuni che
      rispondono. Niente pubblicazione automatica di ogni segnalazione con tag alle autorità.
- [ ] **Registrazione con SPID / CIE** (tramite soggetto aggregatore) e verifica del telefono con SMS.
- [ ] **Fornitore delle mappe** per il lancio pubblico: i server di OpenStreetMap non vanno usati per app con
      molto traffico (regole d'uso OSM); scegliere un servizio di tessere (o ospitarle) e aggiornare l'informativa.
- [ ] **Passaggio al server cloud** (`INSTALLAZIONE_VPS.md`) per il lancio pubblico.

## Fatto

| Data | Cosa |
|---|---|
| 24/10/2026 | **Segnalazione anonima**: scelta predefinita in registrazione e nel profilo, modificabile in ogni segnalazione; il Comune non riceve i dati del cittadino, gli operatori non li vedono, le risposte del Comune vengono inoltrate al cittadino via email |
| 24/10/2026 | Pagina **Chi siamo** (clic sul nome CivicAlerts) con i progettisti; foto ingrandita in dashboard con pulsante **Chiudi** (prima nell'app installata non si tornava indietro) |
| 21/10/2026 | **Lettura automatica della casella PEC**: ricevute di consegna, risposte dei Comuni collegate alla segnalazione e numero di protocollo inserito da solo (o a mano con "Protocollo del Comune"); `civicalerts@pec.it` in copia nelle risposte |
| 21/10/2026 | Anteprima e modifica della PEC prima dell'approvazione; scelta fra posizione della foto e posizione attuale |
| 13/10/2026 | **Nota nella PEC al Comune** "Perché ricevete questa PEC": richiesta di indirizzi, WhatsApp o gestori specifici da comunicare a `civicalerts@pec.it` |
| 13/10/2026 | **Approvazione dell'amministratore prima dell'invio**: pagina Ufficio › Da approvare con interruttore, Approva e invia la PEC / Non approvare con motivo, nota per il cittadino durante la segnalazione, nella ricevuta e nella pagina |
| 13/10/2026 | **Avviso via email/WhatsApp** quando l'indirizzo internet di casa cambia e il DNS non è aggiornato |
| 13/10/2026 | DNS su Aruba aggiornato al nuovo indirizzo di casa (95.236.3.245) |
| 11/10/2026 | **Privacy**: informativa completa, casella "almeno 14 anni", cancellazione account dal profilo, cancellazione automatica dei dati (segnalazioni 2 anni, account inattivi 1 anno, non confermati 30 giorni) |
| 11/10/2026 | Bozza dell'informativa per il legale; scheda tecnica del progetto |
| 09/10/2026 | Correzione del blocco con Chrome 155; errori dell'app in italiano e registrati nei log |
| 09/10/2026 | Script di ripartenza dopo un blackout (`scripts/avvio.ps1`) e guida |
| 08/10/2026 | Ricevuta via email, promemoria dopo 15 giorni, stesso problema da più cittadini, elenco pubblico per Comune, categoria "Segnaletica" al posto di "Incidente" |
| 08/10/2026 | Amministrazione: pagina Comuni (modifica PEC) e segnalazioni per cittadino |
| 07/10/2026 | Sezione Amministrazione: panoramica, cittadini, operatori, invii PEC |
| 07/10/2026 | Sito civicalerts.it e app app.civicalerts.it pubblicati dal server di casa; PEC reale tramite Aruba |
| 06/10/2026 | Cruscotto per gli uffici comunali |
| 05/10/2026 | Nuova app scritta da zero, installabile sul server di casa |
