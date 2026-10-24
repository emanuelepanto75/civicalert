# CivicAlerts

Segnalazione civica certificata: il cittadino fotografa un problema (buca,
lampione spento, rifiuti…), il telefono rileva la posizione GPS e la
segnalazione viene inviata **via PEC al Comune competente**, individuato
automaticamente fra i 7.904 comuni italiani.

> **Stato: versione di test in rete locale.** Tutte le email e le PEC finiscono
> in una casella di prova (Mailpit): nessun messaggio raggiunge i Comuni.

## Funzionalità

| | |
|---|---|
| 👤 Account | Registrazione (nome, cognome, email, telefono, consenso privacy), conferma email, accesso, password dimenticata, blocco dopo 5 tentativi errati |
| 📍 Segnalazione | Foto/video dalla fotocamera o galleria, GPS automatico non modificabile, categoria, descrizione, riepilogo prima dell'invio |
| 🏛 Instradamento | Indirizzo e Comune ricavati dalle coordinate (OpenStreetMap), PEC del Comune dall'Indice PA |
| 📨 PEC | Email con scheda e foto allegata; 3 tentativi automatici in caso di errore; registro degli invii |
| 🛡 Controlli | Stesso problema segnalato da più cittadini (stessa categoria entro 50 m): la segnalazione parte comunque, collegata alla prima, e la PEC indica quante sono; lo stesso utente non può ripeterla. Limite giornaliero anti-spam, avvisi di autenticità (foto vecchia o scattata altrove, GPS impreciso) |
| 📧 Email al cittadino | Ricevuta dopo l'invio; avviso a ogni cambio di stato (anche per chi ha segnalato lo stesso problema); per i Comuni senza cruscotto, dopo 15 giorni promemoria "il problema è stato risolto?" |
| ✅ Chiusura | Il cittadino può segnare la segnalazione come risolta |
| 🗺 Mappa ed elenco pubblici | Mappa e elenco per Comune (`/segnalazioni`) con data e stato, senza dati personali dei segnalanti |
| 🏛 Cruscotto ufficio (`/ufficio`) | Per gli operatori comunali: indicatori, grafico per categoria, mappa, filtri, esportazione CSV, presa in carico / risoluzione / respingimento con email al cittadino, note interne e storico. L'amministratore crea gli operatori e li assegna al Comune |
| 📱 PWA | Installabile sulla schermata Home di iPhone e Android |

## Avvio

Guida completa passo passo per il server Windows:
**[docs/INSTALLAZIONE_WINDOWS.md](docs/INSTALLAZIONE_WINDOWS.md)**

In breve:

```powershell
copy .env.example .env      # poi modificare SERVER_IP e le password
docker compose up -d --build
```

Dal telefono: `http://IP-DEL-SERVER` → installa il certificato → apri l'app.

**Server di casa raggiungibile da internet** (civicalerts.it e, se vuoi, app.civicalerts.it con HTTPS vero):
**[docs/SERVER_CASA_INTERNET.md](docs/SERVER_CASA_INTERNET.md)**

**Produzione su server cloud** (dominio pubblico, HTTPS automatico, email e PEC reali):
**[docs/INSTALLAZIONE_VPS.md](docs/INSTALLAZIONE_VPS.md)** – usa `docker-compose.prod.yml`, `caddy/Caddyfile.prod` e `.env.prod.example`.

## Struttura

```
app/                 Applicazione Next.js (pagine + API)
  prisma/            Schema database, migrazioni, dati comuni/PEC, seed
  src/app/           Pagine e API (cartella api/)
  src/lib/           Logica: sessioni, geocoding, PEC, foto, controlli
caddy/Caddyfile      HTTPS locale con certificato proprio
docker-compose.yml   Database, app, Mailpit, Caddy
scripts/backup.ps1   Backup di database e foto
legacy/              Versione precedente (solo consultazione)
```

## Sviluppo

```bash
cd app
npm install
# database e mailpit di sviluppo
docker run -d --name ca-db -e POSTGRES_USER=civicalert -e POSTGRES_PASSWORD=civicalert -p 5432:5432 postgres:16-alpine
docker run -d --name ca-mail -p 1025:1025 -p 8025:8025 axllent/mailpit
echo 'DATABASE_URL="postgresql://civicalert:civicalert@localhost:5432/civicalert"' > .env
npx prisma migrate dev && npm run db:seed
npm run dev          # http://localhost:3000 – posta su http://localhost:8025
```

Sul PC di sviluppo il GPS funziona su `http://localhost` (i browser lo
considerano sicuro); dal telefono serve l'HTTPS fornito da Caddy.
