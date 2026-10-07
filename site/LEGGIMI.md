# Sito di presentazione – civicalerts.it

Pagina statica (nessun cookie, nessun dato raccolto). Si può pubblicare dal server di casa
(vedi `docs/SERVER_CASA_INTERNET.md`) oppure gratis su Netlify:

1. Vai su https://app.netlify.com/drop (account gratuito) e trascina la cartella `site`.
2. In *Domain management* aggiungi il dominio `civicalerts.it`.
3. Nel pannello DNS di Aruba:
   - record **A** per `civicalerts.it` (`@`) → `75.2.60.5`
   - record **CNAME** per `www` → `NOME-DEL-SITO.netlify.app`
   - non toccare i record MX della posta.
4. Netlify attiva da solo il certificato HTTPS.

Quando l'app sarà sul server cloud, potrà stare su `app.civicalerts.it`
(record A verso l'IP del server) lasciando questa pagina su `civicalerts.it`.
