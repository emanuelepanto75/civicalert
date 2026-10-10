# CivicAlerts – cose da fare

Elenco delle attività decise e non ancora fatte. Aggiornato il 10/10/2026.

## Prima di allargare le prove

- [ ] **Ripartenza automatica dopo un blackout** sul server di casa: BIOS (Power On), accesso automatico,
      attività pianificata `scripts/avvio.ps1` (guida: `INSTALLAZIONE_WINDOWS.md`, "Ripartenza automatica").
- [ ] **Avviso "versione di prova"** nell'app, nella schermata finale e nell'email di ricevuta, attivo finché
      `PEC_OVERRIDE_TO` è impostato: le segnalazioni non arrivano ai Comuni.
- [ ] **Privacy e consenso da rivedere**: informativa definitiva (titolare, finalità, basi giuridiche, destinatari,
      tempi di conservazione, diritti, contatti), testo della casella in registrazione, eventuali consensi
      facoltativi separati, età minima.
- [ ] **Indirizzo internet di casa che cambia** (TIM): passare la gestione DNS a Cloudflare con aggiornamento
      automatico, oppure usare il tunnel Cloudflare.

## Prossimi sviluppi brevi

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
