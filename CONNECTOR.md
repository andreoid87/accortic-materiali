# Materiali dal connettore privato

La richiesta docente del 2026-10-31 autorizza una nuova modalità per le **nuove presentazioni**: bozze strutturate conservate nel servizio privato e pacchetti approvati distribuiti qui. Non migra i sorgenti Drive né riscrive release già pubblicate.

Supporto additivo: `accortic-slide-blocks-v1`, provenienza `urn:accortic:slides:sha256:<hash>` vincolata ad `approval.sourceSha256`; immagini PNG/JPEG/WebP con firma, estensione/MIME e hash verificati; runtime del connettore presenti nell'allowlist insieme ai precedenti. Le versioni Drive/GrapesJS esistenti restano accettate.

Il codice del servizio è nel repository privato `andreoid87/accortic`, directory `integrations/slides-connector`. Le bozze, le credenziali e gli URL privati non entrano nel repository pubblico. Pubblica richiede revisione esplicita, produce nuove versioni e usa il workflow esistente: validazione, deploy, smoke, attivazione current, secondo deploy/smoke. Un commit di tooling non pubblica automaticamente le slide.
# App privata GrapesJS su Workers — 2026-10-31

Il nuovo percorso mantiene un unico progetto nativo `accortic-grapes-v1` condiviso tra editor manuale e MCP, privato su D1. Questo repository riceve soltanto runtime approvati e nuove release immutabili. Il validatore ammette anche la provenienza `urn:accortic:slides:sha256:<hash>` per GrapesJS, legata esattamente a `approval.sourceSha256`; sorgenti Drive e formato block-v1 restano validi. Non pubblicare il JSON editoriale, recuperi D1 o credenziali. Nessuna release o riferimento current è modificato da questo aggiornamento del validatore.

