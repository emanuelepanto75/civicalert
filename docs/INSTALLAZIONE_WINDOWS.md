# Installazione di CivicAlerts sul server Windows

Questa guida installa CivicAlerts sul server di casa/ufficio. L'app sarà
raggiungibile **solo dalla tua rete** (Wi-Fi o cavo) e dai telefoni
**collegati alla VPN**. Nessun servizio esterno da configurare.

Tempo richiesto: circa 30–45 minuti la prima volta.

---

## 0. Requisiti

- **Windows 10 o 11 a 64 bit** (Home o Pro), aggiornato.
  Su *Windows Server* Docker Desktop non è supportato: in quel caso la procedura è diversa, chiedimi.
- **RAM**: 8 GB consigliati (minimo 4 GB). **Disco**: almeno 20 GB liberi.
- **Virtualizzazione attiva** nel BIOS (di solito lo è già: in Gestione attività › Prestazioni › CPU deve comparire "Virtualizzazione: Abilitato").
- Il server deve poter navigare su internet (servono le mappe e la ricerca degli indirizzi).

---

## 1. Installa WSL2 e Docker Desktop

1. Apri **PowerShell come amministratore** (tasto destro su Start › Terminale (Amministratore)) ed esegui:
   ```powershell
   wsl --install
   ```
   Riavvia il PC quando richiesto.
2. Scarica e installa **Docker Desktop** da <https://www.docker.com/products/docker-desktop/>.
   Durante l'installazione lascia selezionato **"Use WSL 2 instead of Hyper-V"**.
3. Apri Docker Desktop, accetta i termini (l'uso personale e per piccole aziende è gratuito), poi in
   **Settings › General** attiva **"Start Docker Desktop when you sign in to your computer"**.

> ⚠️ Docker Desktop si avvia quando un utente accede a Windows. Su un server
> che deve restare sempre acceso, configura l'**accesso automatico** dell'utente
> e disattiva sospensione/ibernazione (Impostazioni › Sistema › Alimentazione).

Verifica in PowerShell:
```powershell
docker --version
docker compose version
```

---

## 2. Scarica il progetto

1. Installa **Git for Windows** da <https://git-scm.com/download/win> (opzioni predefinite).
2. In PowerShell:
   ```powershell
   cd C:\
   git clone https://github.com/emanuelepanto75/civicalert.git
   cd C:\civicalert
   ```
   Il repository è privato: alla prima volta si aprirà una finestra per accedere a GitHub.

   > Finché le modifiche non sono unite al ramo principale, scarica il ramo di lavoro:
   > `git checkout claude/funny-fermi-5f7lor`

---

## 3. Dai al server un indirizzo IP fisso

1. In PowerShell esegui `ipconfig` e annota l'**Indirizzo IPv4** della scheda di rete
   (es. `192.168.1.50`).
2. Nel pannello del router, nella sezione DHCP, **riserva quell'indirizzo** per il server
   (si chiama "IP statico", "Prenotazione DHCP" o simile). Così non cambierà dopo un riavvio.

---

## 4. Configura

```powershell
copy .env.example .env
notepad .env
```

Modifica almeno queste righe:

| Variabile | Cosa mettere |
|---|---|
| `SERVER_IP` | l'IP del passo 3, es. `192.168.1.50` |
| `DB_PASSWORD` | una password lunga a piacere |
| `MAILPIT_PASSWORD` | un'altra password: serve per aprire la casella di prova |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | (facoltativi) il tuo account amministratore |

Salva e chiudi.

> 💡 Durante i primi test con altre persone puoi mettere
> `REQUIRE_EMAIL_VERIFICATION=false`: le email di conferma non arrivano nelle
> caselle reali (finiscono in Mailpit), quindi chi si registra non potrebbe confermarle da solo.

---

## 5. Apri le porte nel firewall di Windows

In **PowerShell come amministratore**:

```powershell
# La rete deve essere "Privata" (non "Pubblica")
Get-NetConnectionProfile
Set-NetConnectionProfile -InterfaceAlias "Ethernet" -NetworkCategory Private   # usa il nome mostrato sopra

New-NetFirewallRule -DisplayName "CivicAlerts" -Direction Inbound -Protocol TCP -LocalPort 80,443 -Action Allow -Profile Private,Domain
```

Le porte 80/443 vengono aperte **solo verso la rete locale**: non serve (e non va fatto)
aprire nulla sul router.

---

## 6. Avvia

Dalla cartella `C:\civicalert`:

```powershell
docker compose up -d --build
```

La prima volta impiega 5–10 minuti (scarica e prepara tutto). Poi controlla:

```powershell
docker compose ps          # tutti i servizi devono essere "Up" / "running"
docker compose logs app    # deve comparire "Importati 7904 comuni" e "Ready"
```

Prova dal browser del server: <https://localhost>. Comparirà un avviso di sicurezza
perché il certificato non è ancora installato (vedi il passo 8 per installarlo anche sul PC).

Da qui in poi CivicAlerts **ripartirà da solo** a ogni riavvio del server.

---

## 7. Installa il certificato sul telefono (una volta sola)

Il telefono deve essere sulla stessa rete Wi-Fi del server, oppure collegato alla VPN.

1. Apri nel browser **`http://IP-DEL-SERVER`** (es. `http://192.168.1.50`, con **http**, senza la "s").
2. Tocca **"Scarica certificato"**.

### iPhone / iPad (usa Safari)
1. Alla domanda "Vuoi consentire il download del profilo di configurazione?" tocca **Consenti**.
2. Apri **Impostazioni** › in alto compare **"Profilo scaricato"** › **Installa** (inserisci il codice del telefono) › **Installa**.
3. Vai in **Impostazioni › Generali › Info › Impostazioni certificati attendibili** e
   **attiva** l'interruttore di **"Caddy Local Authority"**. ← passaggio spesso dimenticato

### Android
1. Il file `CivicAlerts-CA.crt` viene scaricato.
2. Apri **Impostazioni › Sicurezza** (o "Sicurezza e privacy") › **Altre impostazioni di sicurezza** ›
   **Crittografia e credenziali** › **Installa un certificato** › **Certificato CA** ›
   **Installa comunque** › scegli `CivicAlerts-CA.crt` dai Download.
   (Il percorso cambia un po' tra le marche: cerca "certificato CA" nelle Impostazioni.)
3. Chiudi e riapri Chrome.

---

## 8. Usa l'app

1. Sul telefono apri **`https://IP-DEL-SERVER`** (con la **s**). Non deve comparire alcun avviso.
2. **Aggiungi alla schermata Home**:
   - iPhone (Safari): pulsante Condividi › **Aggiungi alla schermata Home**
   - Android (Chrome): menu ⋮ › **Installa app** / **Aggiungi a schermata Home**
3. Registrati, conferma l'email (vedi sotto), fai una segnalazione di prova.

**Casella di prova (Mailpit):** `https://IP-DEL-SERVER/mailpit/`, utente `admin`, password
`MAILPIT_PASSWORD`. Qui trovi le email di conferma registrazione e le **PEC che sarebbero state
inviate ai Comuni**, con la foto allegata.

**Sul PC del server** (facoltativo): scarica `http://localhost/certificato.crt`, doppio clic ›
**Installa certificato** › Computer locale › "Colloca tutti i certificati nel seguente archivio" ›
**Autorità di certificazione radice attendibili**. Riavvia il browser.

---

## 9. Uso con la VPN

Collegato alla VPN, il telefono deve usare **lo stesso indirizzo `https://IP-DEL-SERVER`**
della rete locale (non l'eventuale indirizzo della VPN). Verifica così: disattiva il Wi-Fi,
attiva la VPN in 4G/5G e apri `http://IP-DEL-SERVER`: se compare la pagina CivicAlerts, funziona.

Se non si apre, la VPN non instrada la rete locale: nella configurazione della VPN
la rete dell'ufficio (es. `192.168.1.0/24`) deve essere tra gli "IP consentiti" / "rotte".

---

## 10. Cruscotto per gli uffici comunali

Gli operatori del Comune gestiscono le segnalazioni da computer su **`https://IP-DEL-SERVER/ufficio`**:
indicatori, grafico per categoria, mappa, elenco filtrabile, esportazione CSV, presa in carico /
risoluzione / respingimento con email automatica al cittadino, note interne e storico.

**Creare gli operatori**
1. Nel file `.env` imposta `ADMIN_EMAIL` e `ADMIN_PASSWORD`, poi `docker compose up -d`:
   al riavvio viene creato l'account amministratore.
2. Accedi con quell'account: vieni portato su `/ufficio`. Apri **Operatori**, scegli il Comune,
   inserisci nome, email e una password iniziale.
3. L'operatore accede da `/accedi` con quelle credenziali e vede **solo** le segnalazioni del suo Comune
   (può cambiare la password con "Password dimenticata").

**Amministrazione (solo per l'account amministratore)**
Nel menu in alto, oltre al Cruscotto:
- **Panoramica**: numeri di tutta la piattaforma, andamento settimanale, classifica dei Comuni,
  segnalazioni sospette, cittadini più attivi, avvisi su PEC non consegnate e modalità collaudo.
- **Cittadini**: ricerca, blocca/sblocca, elimina (a scelta anche segnalazioni e foto).
- **Operatori**: crea gli account dei Comuni, blocca/sblocca, nuova password, elimina.
- **Invii PEC**: tutti gli invii con l'errore restituito dal server di posta e il pulsante **Riprova**.

**Dati dimostrativi (per presentazioni)**
```powershell
docker compose exec app node prisma/demo.mjs            # crea ~26 segnalazioni finte a Messina
docker compose exec app node prisma/demo.mjs --remove   # le cancella tutte
```
Accesso demo: `operatore@demo.civicalert.local` / `demo-civicalert`. Le foto sono riquadri con la scritta
"FOTO DIMOSTRATIVA" e nessuna PEC viene inviata. Ricordati di rimuoverli prima dell'uso reale.

**Utenti registrati durante le prove**
```powershell
docker compose exec app node prisma/utenti.mjs                                   # elenca gli utenti
docker compose exec app node prisma/utenti.mjs --elimina prova@email.it altra@email.it  # elimina utenti, segnalazioni e foto
```
Gli amministratori non vengono mai eliminati da questo comando.

---

## Comandi utili

| Cosa | Comando (da `C:\civicalert`) |
|---|---|
| Stato dei servizi | `docker compose ps` |
| Log dell'app | `docker compose logs -f app` (Ctrl+C per uscire) |
| Fermare tutto | `docker compose down` |
| Riavviare | `docker compose restart` |
| **Aggiornare** a una nuova versione | `git pull` e poi `docker compose up -d --build` |
| **Backup** | `.\scripts\backup.ps1` |

> `docker compose down` **non** cancella i dati. Non usare mai `docker compose down -v`:
> il `-v` elimina database e foto.

### Backup automatico notturno

1. Prova lo script una volta: `powershell -ExecutionPolicy Bypass -File C:\civicalert\scripts\backup.ps1`
   Crea `C:\civicalert\backup\<data>\` con `database.dump` e la cartella `uploads`.
2. Apri **Utilità di pianificazione** › Crea attività di base › "Backup CivicAlerts" › Giornaliera, ore 03:00 ›
   Avvio programma: `powershell.exe`, argomenti:
   `-ExecutionPolicy Bypass -File C:\civicalert\scripts\backup.ps1`
3. Copia periodicamente la cartella `backup` **fuori dal server** (disco esterno o cloud).

**Ripristino** di un backup:
```powershell
docker compose cp backup\<data>\database.dump db:/tmp/restore.dump
docker compose exec db pg_restore -U civicalert -d civicalert --clean --if-exists /tmp/restore.dump
docker compose cp backup\<data>\uploads\. app:/data/uploads
```

---

## Problemi frequenti

| Problema | Soluzione |
|---|---|
| `docker compose ps` non mostra `caddy`, oppure "port is already allocated" su 80 o 443 | Un altro programma usa la porta. Controlla con `netstat -ano \| findstr LISTENING \| findstr ":80 :443"`: se il PID è **4**, quasi sempre è IIS (in `http://localhost` compare una pagina di IIS o un errore 404). Se non ti serve, in PowerShell come amministratore: `Stop-Service W3SVC, WAS -Force; Set-Service W3SVC -StartupType Disabled; Set-Service WAS -StartupType Disabled`, poi `docker compose up -d` |
| Dal telefono la pagina non si apre | Telefono sulla stessa rete? Rete Windows impostata su "Privata"? Regola firewall creata (passo 5)? |
| Avviso "connessione non privata" sul telefono | Certificato non installato o (iPhone) non attivato in "Impostazioni certificati attendibili" |
| "Il GPS funziona solo con connessione sicura" | Stai usando `http://`: apri `https://IP-DEL-SERVER` |
| "Permesso posizione negato" | iPhone: Impostazioni › Privacy › Localizzazione › Safari › "Mentre usi l'app". Android: tieni premuto il lucchetto nella barra indirizzi › Autorizzazioni › Posizione |
| Comune non identificato | Il server non raggiunge internet, oppure la posizione è fuori dall'Italia |
| L'IP del server è cambiato | Aggiorna `SERVER_IP` nel file `.env` ed esegui `docker compose up -d`: il certificato già installato sui telefoni resta valido |
