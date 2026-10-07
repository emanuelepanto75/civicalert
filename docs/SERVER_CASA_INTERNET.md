# Pubblicare civicalerts.it dal server di casa

Questa guida rende raggiungibile da internet, dal server Windows di casa:

| Indirizzo | Cosa mostra | Obbligatorio |
|---|---|---|
| `https://civicalerts.it` (e `www.`) | la pagina di presentazione (cartella `site`) | sì |
| `https://app.civicalerts.it` | l'app per i cittadini e il cruscotto `/ufficio` | facoltativo |

Il certificato HTTPS è vero (Let's Encrypt): nessun certificato da installare sui telefoni.
L'accesso dalla rete di casa con `https://IP-DEL-SERVER` continua a funzionare come prima.
La casella di prova Mailpit **non** viene esposta su internet.

---

## 0. Controlla la tua connessione (5 minuti)

Servono due informazioni.

**a) Hai un IP pubblico?**
1. Entra nel pannello del router (di solito `http://192.168.1.1`) e annota l'**IP WAN / IP pubblico**.
2. Dal PC apri <https://www.whatismyip.com> e confronta.

| Risultato | Significato |
|---|---|
| I due indirizzi sono **uguali** | hai un IP pubblico: prosegui con questa guida |
| Sono **diversi**, oppure l'IP del router inizia con `100.64`–`100.127`, `10.` o `192.168.` | sei dietro **CGNAT**: dall'esterno non si può raggiungere il server aprendo porte. Chiedi all'operatore un IP pubblico (spesso gratis o pochi €/mese), oppure si usa un tunnel Cloudflare (chiedi) |

**b) L'IP è fisso o cambia?**
Chiedi all'operatore o guarda il contratto ("IP statico"). Se **cambia** (dinamico), il sito smette di
funzionare a ogni cambio finché non aggiorni il DNS: per le prove va bene, per un uso continuo serve
un IP statico o un DNS dinamico (vedi in fondo).

---

## 1. Router: inoltra le porte al server

Nel pannello del router cerca **Port forwarding / Inoltro porte / Virtual server / NAT** e crea:

| Porta esterna | Protocollo | Verso IP | Porta interna |
|---|---|---|---|
| 80 | TCP | IP del server (es. `192.168.1.50`) | 80 |
| 443 | TCP | IP del server | 443 |
| 443 | UDP | IP del server | 443 (facoltativa, velocizza i telefoni) |

- Se il router usa le porte 80 o 443 per la **gestione remota**, disattivala (si gestisce comunque da casa).
- Non aprire nessun'altra porta.

Il firewall di Windows è già a posto (regola "CivicAlerts" del passo 5 dell'installazione): il traffico
da internet arriva dal router, cioè dalla rete privata.

---

## 2. DNS su Aruba

Pannello Aruba › **Gestione DNS** di `civicalerts.it`:

| Tipo | Nome | Valore |
|---|---|---|
| A | `@` (o vuoto) | il tuo IP pubblico |
| A | `www` | il tuo IP pubblico |
| A | `app` | il tuo IP pubblico (solo se attivi l'app, punto 3) |

- Se ci sono già record **A** per `@` o `www` (pagina di cortesia Aruba), **modificali**.
- **Non toccare i record MX** e quelli della posta: servono alle caselle email.
- Se si può scegliere, imposta il **TTL** più basso (es. 1 ora): eventuali cambi di IP si propagano prima.

Verifica dopo qualche minuto, da PowerShell:
```powershell
nslookup civicalerts.it 8.8.8.8
```
deve rispondere con il tuo IP pubblico.

---

## 3. Attiva il sito (e se vuoi l'app) sul server

```powershell
cd C:\civicalert
git pull
copy caddy\esempi\sito.caddy caddy\pubblico\
copy caddy\esempi\app.caddy caddy\pubblico\    # solo se vuoi https://app.civicalerts.it
docker compose up -d
docker compose logs caddy --tail 40
```

Nei log deve comparire `certificate obtained successfully` per `civicalerts.it` (e `app.civicalerts.it`).
Se compare un errore di "challenge", di solito il DNS non è ancora propagato o le porte non sono
inoltrate: Caddy riprova da solo, ricontrolla i passi 1 e 2.

---

## 4. Prova da fuori casa

Dal telefono **con il Wi-Fi spento** (rete mobile):
- `https://civicalerts.it` → pagina di presentazione, lucchetto senza avvisi;
- `http://www.civicalerts.it` → porta alla stessa pagina in https;
- `https://app.civicalerts.it` → l'app (se attivata), senza certificati da installare.

> Dal Wi-Fi di casa alcuni router non riescono ad aprire il proprio IP pubblico ("NAT loopback").
> Se da casa non si apre ma dalla rete mobile sì, è normale: da casa usa `https://IP-DEL-SERVER`.

---

## Aggiornare la pagina di presentazione

La pagina è la cartella `C:\civicalert\site`: modifica `index.html` (o fai `git pull` dopo che l'ho
aggiornata) e le modifiche sono online subito, senza riavviare nulla.

## Disattivare l'accesso da internet

```powershell
del caddy\pubblico\*.caddy
docker compose restart caddy
```
e togli l'inoltro delle porte dal router.

## Sicurezza

- Da internet sono raggiungibili solo la pagina di presentazione e (se attivata) l'app con il suo login.
- Usa una password lunga per l'amministratore (`ADMIN_PASSWORD`) e gli operatori.
- Tieni Windows e Docker Desktop aggiornati; il backup notturno resta indispensabile.
- Il server deve restare acceso: se è spento, sito e app non rispondono.

## IP dinamico

Se l'IP pubblico cambia, aggiorna i record A su Aruba con il nuovo indirizzo. Per non doverlo fare a
mano le strade sono: chiedere all'operatore un **IP statico**, oppure spostare la gestione DNS su un
servizio con **DNS dinamico** (es. Cloudflare, gratuito: si ricopiano i record della posta). Per il
lancio vero resta consigliato il server cloud (`docs/INSTALLAZIONE_VPS.md`).
