# Materiali AccorTIC

Un repository per i pacchetti HTML approvati. Sorgenti/editor e versioni di lavoro nel Drive condiviso AccorTIC/TIC; applicazione e dati studenti in andreoid87/accortic/Firebase. Nessuna pubblicazione dell'app o cambio all'autonomia da questo repository.

## Uso e contratto

Ogni release è immutabile: `releases/interno-pc/v1/` diventa `https://andreoid87.github.io/accortic-materiali/interno-pc/v1/`. `#slideId` seleziona una slide; `?single=1#slideId` la mostra senza barra. Non occorre un repository/file per ogni slide.

material.json v1: identità/versione/hash; slideOrder separato da slides con ID stabili, titolo, asset, tag pesati (vuoti fino a P31D), Coverage/riferimenti; file con byte/SHA256; approvazione pubblica e provenienza; progetto riapribile sul Drive in formato snapshot nativo. L'adattatore GrapesJS è P31C, non implementato qui. Non trasferire snapshot editoriali nel sito pubblico.

`node scripts/package.mjs <preview-verificata> <nuova-cartella-release>` produce HTML senza script editoriale, player/CSS fidati e asset content-addressed. Mantiene l'ordine e i riferimenti originali. Le illustrazioni Interno PC sono dichiarate dal docente generate con IA prendendo spunto dal libro (2026-10-07); non attribuire alle figure la provenienza di scansioni del manuale. Nessuna licenza CC o cessione di diritti implicita: sola autorizzazione alla distribuzione richiesta.

## Pubblicazione e recupero

1. Nuova release in catalog.releases, current ancora alla versione verificata precedente.
2. `npm ci`, `npm test`, `npm run build`; il push su dev valida soltanto.
3. Avviare esplicitamente il workflow Pages su dev; lo smoke verifica manifest e hash di tutti i file online.
4. Dopo successo aggiornare catalog.current, commit e nuovo deploy esplicito. Fallimento: non attivare current; versioni precedenti restano disponibili.
5. Rollback: cambiare solo current verso un release già verificato e ripubblicare. Non eliminare file vecchi. Gli URL usati da tentativi futuri saranno fissati alla versione in P31E; nessuna modifica ai tentativi esistenti.

HTML con CSP: script esterno del solo player, immagini locali, nessuna connessione di rete applicativa; CSS inline limitato al layout. Iframe AccorTIC usa sandbox allow-scripts senza same-origin. CORS non serve alla sola visualizzazione iframe; Pages non consente header personalizzati e i cache header effettivi vanno misurati, non promessi immutable. Tag/indice futuro vanno richiesti solo dalla pubblicazione selezionata, non per click di aiuto. Tutti i materiali Pages sono pubblici anche se l'app richiede login.

Distribuzione standard GitHub Actions/Pages in repo pubblico, senza servizi a pagamento. [Documentazione Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Stato verificato 2026-10-07

Corrente: https://andreoid87.github.io/accortic-materiali/interno-pc/v2/ ; v1 resta disponibile allo stesso percorso con v1. Deploy verificato83723e4,run37632354464. V2 evita prefetch delle immagini delle slide nascoste; contenuti identici alla v1. Per nuove versioni passare il numero esplicito: node scripts/package.mjs <preview> releases/interno-pc/v3 3.

Misura CPU p3:555459byte compressi cold,transfer warm0 nella prova browser; Cache-Control max-age=600. Pacchetto completo v2 con manifest2873860byte decodificati. Asset unici e riusati fra canvas/lettura dentro la release; ogni versione conserva la propria copia,non dedup globale. Criteri/editor/mappatura sono i successivi P31C/D/E; non implementati qui.

