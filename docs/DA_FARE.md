# CivicAlerts – cose da fare

Elenco delle attività decise e non ancora fatte. Aggiornato il 13/10/2026.

## Prima di allargare le prove

- [ ] **Ripartenza automatica dopo un blackout** sul server di casa: BIOS (Power On), accesso automatico,
      attività pianificata `scripts/avvio.ps1` (guida: `INSTALLAZIONE_WINDOWS.md`, "Ripartenza automatica").
- [ ] **Avviso "versione di prova"** nell'app, nella schermata finale e nell'email di ricevuta, attivo finché
      `PEC_OVERRIDE_TO` è impostato: le segnalazioni non arrivano ai Comuni.
- [x] **Privacy**: informativa completa, casella "almeno 14 anni", cancellazione account dal profilo,
      cancellazione automatica (segnalazioni 2 anni, account inattivi 1 anno, non confermati 30 giorni).
- [ ] **Privacy, da completare sul server**: `TITOLARE_NOME` e `TITOLARE_INDIRIZZO` nel `.env`; far rileggere
      il testo da un professionista prima del lancio pubblico.
- [ ] **Indirizzo internet di casa che cambia** (TIM): passare la gestione DNS a Cloudflare con aggiornamento
      automatico, oppure usare il tunnel Cloudflare. Nel frattempo l'app avvisa via email/WhatsApp
      quando il DNS non corrisponde più (`ALERT_*` nel `.env`).

## Prossimi sviluppi brevi

- [x] **Approvazione dell'amministratore prima dell'invio** (fase iniziale): pagina Ufficio › Da approvare
      con interruttore; la PEC parte solo dopo "Approva", "Non approvare" chiude la segnalazione con il motivo
      inviato al cittadino. Nota per il cittadino durante la segnalazione, nella ricevuta e nella pagina.
- [ ] **Nota nella PEC al Comune sugli altri canali**: in fondo al testo chiedere al Comune se per quel tipo
      di problema esistono altri canali (email dell'ufficio, numero WhatsApp, app comunale) da usare in futuro,
      con la risposta da inviare a `civicalerts@pec.it`; i canali ricevuti si annotano nella pagina Comuni.
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
- [ ] **Passaggio al server cloud** (`INSTALLAZIONE_VPS.md`) per il lancio pubblico.
