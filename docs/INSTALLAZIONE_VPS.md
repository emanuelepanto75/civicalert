# Installazione di CivicAlert su server cloud (Aruba Cloud VPS)

Questa guida porta CivicAlert online su **https://civicalerts.it**, con certificato
HTTPS automatico (nessun certificato da installare sui telefoni), email reali ai
cittadini e PEC ai Comuni.

Tempo richiesto: circa 1 ora. Tutti i comandi si scrivono dal PC Windows, in
PowerShell, collegati al server.

---

## 0. Cosa serve

| Cosa | Esempio | Note |
|---|---|---|
| Server Aruba Cloud VPS | **O2A4** (2 vCPU, 4 GB RAM, 40 GB), **Ubuntu 24.04** | 4 GB servono per costruire l'app |
| Dominio | `civicalerts.it` | già acquistato |
| Casella email del dominio | `noreply@civicalerts.it` | per conferme e avvisi ai cittadini |
| Casella PEC | `segnalazioni@pec.it` | per le segnalazioni ai Comuni |
| Account GitHub con accesso al repository | `emanuelepanto75/civicalert` | per scaricare il codice sul server |

---

## 1. Crea il server

1. Nel pannello **Aruba Cloud** crea un **Cloud VPS** di tipo **O2A4**.
2. Sistema operativo (template): **Ubuntu 24.04 LTS**.
3. Scegli una **password di root** lunga (salvala in un posto sicuro).
4. A creazione finita, annota l'**indirizzo IP pubblico** del server (es. `95.110.xxx.xxx`).

Se il pannello Aruba Cloud offre un firewall del server, apri le porte **22, 80 e 443** (TCP)
e **443** (UDP).

---

## 2. Collega il dominio al server (DNS)

Nel pannello **Aruba** del dominio, sezione **Gestione DNS** di `civicalerts.it`:

| Tipo | Nome | Valore |
|---|---|---|
| A | `@` (oppure vuoto / `civicalerts.it`) | IP del server |
| A | `www` | IP del server |

- Se esistono già record **A** per `@` o `www` (pagina di cortesia Aruba), **modificali** con l'IP del server.
- **Non toccare i record MX e quelli relativi alla posta**: servono alle 5 caselle email.

La propagazione richiede da pochi minuti ad alcune ore. Per verificarla, da PowerShell:
```powershell
nslookup civicalerts.it
```
deve rispondere con l'IP del server.

---

## 3. Entra nel server

Da PowerShell sul PC:
```powershell
ssh root@IP-DEL-SERVER
```
Alla prima connessione rispondi `yes`, poi inserisci la password di root.
Da qui in poi i comandi si eseguono **sul server**.

---

## 4. Prepara il server (una volta sola)

```bash
# aggiornamenti
apt update && apt -y upgrade
apt -y install unattended-upgrades git ufw
dpkg-reconfigure -f noninteractive unattended-upgrades   # aggiornamenti di sicurezza automatici

# firewall: solo SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# Docker (script ufficiale)
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
```

---

## 5. Scarica il progetto

Il repository è privato: serve un **token GitHub di sola lettura**.

1. Su GitHub: *Settings › Developer settings › Personal access tokens › Fine-grained tokens › Generate new token*.
2. Repository access: **solo** `emanuelepanto75/civicalert`; Permissions › Contents: **Read-only**. Scadenza a piacere.
3. Copia il token.

Sul server:
```bash
git clone https://github.com/emanuelepanto75/civicalert.git /opt/civicalert
# Username: il tuo utente GitHub — Password: incolla il token
cd /opt/civicalert
git checkout claude/funny-fermi-5f7lor   # finché le modifiche non sono unite a main
git config credential.helper store       # ricorda il token per i prossimi aggiornamenti
```

---

## 6. Configura

```bash
cp .env.prod.example .env
openssl rand -base64 24      # genera una password: copiala per DB_PASSWORD
nano .env
```

Compila (gli esempi sono già impostati su `civicalerts.it`):

| Variabile | Cosa mettere |
|---|---|
| `DB_PASSWORD` | la password generata sopra |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | il tuo accesso da amministratore |
| `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | la casella `noreply@civicalerts.it` e la sua password |
| `PEC_SMTP_USER`, `PEC_SMTP_PASS`, `PEC_FROM` | la casella PEC e la sua password |
| `PEC_OVERRIDE_TO` | **in collaudo** un tuo indirizzo: tutte le PEC vanno lì e non ai Comuni |

Salva con `Ctrl+O`, Invio, poi esci con `Ctrl+X`.

Server di posta Aruba (già nel modello): email del dominio `smtps.aruba.it` porta 465,
PEC `smtps.pec.aruba.it` porta 465; utente = indirizzo completo.

---

## 7. Avvia

```bash
docker compose up -d --build      # 5–10 minuti la prima volta
docker compose ps                 # 3 servizi Up: app, caddy, db
docker compose logs caddy --tail 30
```
Nei log di Caddy deve comparire che il certificato per `civicalerts.it` è stato ottenuto
(`certificate obtained successfully`). Se il DNS non è ancora propagato, Caddy riprova da solo.

Apri **https://civicalerts.it** dal telefono: niente avvisi, niente certificati da installare.

---

## 8. Collaudo

1. Registrati dall'app: l'email di conferma deve arrivare **davvero** nella tua casella.
2. Fai una segnalazione: la PEC arriva a `PEC_OVERRIDE_TO` (non al Comune), con la foto allegata.
3. Accedi come amministratore su `https://civicalerts.it/ufficio`.
4. Quando tutto funziona e hai deciso di partire, svuota `PEC_OVERRIDE_TO` nel `.env` e
   riavvia con `docker compose up -d`: da quel momento **le PEC arrivano ai Comuni**.

---

## 9. Backup automatico

```bash
crontab -e
```
Aggiungi in fondo:
```
0 3 * * * cd /opt/civicalert && ./scripts/backup.sh >> /var/log/civicalert-backup.log 2>&1
```
I backup (database + foto) finiscono in `/var/backups/civicalert/`, conservati 30 giorni.
Copiali periodicamente **fuori dal server**, per esempio sul PC con WinSCP o con:
```powershell
scp -r root@IP-DEL-SERVER:/var/backups/civicalert C:\backup-civicalert
```
Valuta anche il backup/snapshot del VPS offerto da Aruba Cloud.

---

## Comandi utili (sul server, in `/opt/civicalert`)

| Cosa | Comando |
|---|---|
| Stato | `docker compose ps` |
| Log dell'app | `docker compose logs -f app` |
| Aggiornare | `git pull && docker compose up -d --build` |
| Riavviare | `docker compose restart` |
| Backup manuale | `./scripts/backup.sh` |

Mai `docker compose down -v`: cancella database e foto.

## Problemi frequenti

| Sintomo | Soluzione |
|---|---|
| Il sito non risponde | `nslookup civicalerts.it` deve dare l'IP del server; controlla firewall (`ufw status`) e quello del pannello Aruba |
| Caddy non ottiene il certificato | DNS non ancora propagato, o porte 80/443 chiuse: attendi e controlla `docker compose logs caddy` |
| La build si blocca o va in errore di memoria | il server ha meno di 4 GB di RAM: passa al piano O2A4 o superiore |
| Le email non arrivano | password o utente SMTP errati: `docker compose logs app` mostra l'errore; controlla anche lo spam |
| Le PEC non partono | parametri PEC errati o limiti di invio della casella: chiedi ad Aruba i limiti giornalieri |

## Prima del lancio pubblico

- Informativa privacy e termini d'uso definitivi.
- Mappe: il servizio gratuito di OpenStreetMap non è adatto a traffico elevato; con molti utenti serve un fornitore di mappe.
- Ricerca indirizzi (Nominatim): limite di 1 richiesta al secondo; con molti utenti serve un'alternativa.
