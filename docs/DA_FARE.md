# CivicAlerts – cose da fare

Elenco delle attività decise: prima quelle ancora da fare, in fondo quelle già fatte. Aggiornato il 19/10/2026.

## Da fare sul server di casa

- [ ] **Aggiornare l'app** con le ultime novità (approvazione, nota nella PEC, avviso cambio indirizzo):
      `git pull` e `docker compose up -d --build`.
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

- [ ] **Informativa privacy definitiva**: revisione del legale (bozza pronta), poi inserimento nella pagina Privacy.
      Da includere nella versione definitiva (verifica del 15/10/2026):
      - [ ] **Età minima**: chiedere al legale se tenere 14 anni o alzare a 18 (base giuridica = servizio richiesto,
            nome e telefono arrivano al Comune via PEC). Oggi: casella obbligatoria "almeno 14 anni".
      - [ ] **Mappa**: il browser di chi guarda la mappa scarica le tessere dai server di OpenStreetMap (UK),
            che ricevono l'indirizzo IP; oggi l'informativa cita OSM solo per la ricerca indirizzi.
      - [ ] **Backup**: le copie di sicurezza notturne si conservano 30 giorni (anche dopo una cancellazione);
            vale anche per le copie fuori dal server.
      - Già a posto: nessun font esterno (solo font di sistema), un solo cookie tecnico di sessione dopo
        l'accesso (nessun banner necessario), cancellazione dell'account dal profilo funzionante.
- [ ] **Avviso "versione di prova"** nell'app, nella schermata finale e nell'email di ricevuta, attivo finché
      `PEC_OVERRIDE_TO` è impostato: le segnalazioni non arrivano ai Comuni.
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
- [ ] **Lettura automatica delle risposte** dei Comuni che arrivano su `civicalerts@pec.it`, collegate alla
      segnalazione tramite il codice nell'oggetto.
- [ ] **Registrazione con SPID / CIE** (tramite soggetto aggregatore) e verifica del telefono con SMS.
- [ ] **Fornitore delle mappe** per il lancio pubblico: i server di OpenStreetMap non vanno usati per app con
      molto traffico (regole d'uso OSM); scegliere un servizio di tessere (o ospitarle) e aggiornare l'informativa.
- [ ] **Passaggio al server cloud** (`INSTALLAZIONE_VPS.md`) per il lancio pubblico.

## Fatto

| Data | Cosa |
|---|---|
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
