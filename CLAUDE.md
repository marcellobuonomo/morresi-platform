# CLAUDE.md

## Progetto
Gestionale per **un solo salone (Morresi), una sola sede**: prenotazioni online e agenda, clienti, vendite,
area admin con statistiche (rendimento collaboratori, clienti top per spesa, ...).
- **Mercato: Regno Unito** (2026-11-03): il salone opera nel UK e la piattaforma è ospitata e usata lì
  (GBP, Europe/London, IVA UK, pagamenti online con PSP disponibile nel UK).
- **Single-tenant**: niente `business_id`/`location_id`. Un nuovo salone = nuova installazione con DB separato,
  quindi nessun dato specifico del salone nel codice (tutto in `salon_settings`).
- Specifica di riferimento: [DATA_MODEL.md](DATA_MODEL.md). Le tabelle marcate ✅ sono approvate,
  🟡 in discussione; le parti non ancora revisionate possono citare ancora `business_id`/`location_id`: ignorarli.
- Stack: Java 21, Spring Boot 4.1, Maven (`backend/`, wrapper `mvnw`), PostgreSQL 17, Flyway, Testcontainers.
  Serve JDK 21 (`JAVA_HOME`) e Docker per i test.

## Policy Fresha: sola lettura
Sull'account Fresha del salone (partners.fresha.com) **non si modifica MAI nulla**: niente salvataggi, risposte alle
recensioni, invii, impostazioni, attivazioni, cancellazioni, né click su pulsanti che cambiano dati. Solo lettura e
navigazione per analisi ed estrazione dei dati. Nel dubbio non cliccare e chiedere.

## Branch
`feature/dev` (sviluppo) → `env/svil` (integrazione) → `master` (produzione).
Si lavora e si committa su `feature/dev`; merge verso `env/svil`/`master` solo su richiesta esplicita.

## Stato dei lavori (aggiornare a fine sessione)
**Fase attuale: modello dati approvato e migrato; prossimo passo le funzionalità.** (Revisione fatta una entity alla volta: l'utente approvava ogni tabella con un "ok";
dopo ogni ok si aggiorna DATA_MODEL.md (marcatura ✅) e si committa. Le migrazioni Flyway si scrivono solo
dopo, quando il modello è approvato.)

Approvati (2026-11-02): convenzioni comuni (passo 0), `app_user` / `user_identity` / `user_token`,
`salon_settings` / `opening_hours` / `schedule_exception`, `staff` / `staff_shift` / `staff_time_block` /
`shift_template` / `staff_week_pattern`. Decisa anche la sovrapposizione appuntamenti solo da ADMIN.
Approvato (2026-11-03): catalogo servizi `service_category` / `service` / `service_staff` (niente varianti, niente posa),
`client` / `client_source` / `client_tag` / `client_tag_assignment`, `appointment` / `appointment_item`
(sovrapposizione admin = `forced_overlap`; conferma dall'app solo per clienti registrati),
`sale_sequence` / `sale` / `sale_item` / `payment` (acconto 10% via Stripe, rimborsi = `payment` REFUND),
`product` (solo elenco prodotti; magazzino in sospeso finché il cliente non decide). Buoni in sospeso.
Notifiche `marketing_campaign` (solo email) / `notification_log`: WhatsApp a ogni cliente con telefono, lingua da
`client.nationality`, testi fissi en/it, avvisi email al salone. Recensioni `review` / `review_staff_rating`
(solo clienti registrati) + recensioni Google lette da Places API. `audit_log` solo per operazioni delicate;
tolte `outbox_event` e `idempotency_key`.

**Migrazioni Flyway V2-V8 scritte e applicate (2026-11-03)** sul Postgres locale (riga iniziale `salon_settings` con nome
"MORRESI HAIRSTYLIST"). La rilettura di DATA_MODEL.md §5-§10 è stata saltata su richiesta dell'utente: quelle sezioni
citano ancora cose tolte (sedi, varianti, outbox, ruoli diversi); fa fede §4.
Operazioni sul DB locale (accesso, reset, Flyway, DBeaver, JAVA_HOME): [OP_DB.md](OP_DB.md).
**Analisi Fresha e piano di lavoro (2026-11-05):** [PIANO_LAVORO.md](PIANO_LAVORO.md). Lavoro diviso con Andrea:
area cliente ad Andrea, area admin a Marcello; task con ID (B-/C-/A-) e timeline di 13 settimane dal 2026-11-09.
Il documento elenca anche le funzioni usate su Fresha che mancano al modello (messaggi automatici in più, lista d'attesa,
campagne SMS, codici sconto, ...) e le domande per il titolare: decisioni da prendere prima di toccare il DB.
**Miro (2026-11-05):** Miro è la piattaforma di gestione del progetto; l'utente sta aggiungendo il server MCP di Miro.
**Ripartire da:** verificare che i tool Miro siano disponibili, chiedere il link della board e se usare una board
unica divisa in sezioni o board separate; poi creare su Miro, in quest'ordine: (1) i task di PIANO_LAVORO.md §4 come
card (ID, chi, settimane, dipendenze) in colonne Da fare / In corso / Fatto, più le domande al titolare (§5);
(2) lo schema del DB da DATA_MODEL.md §4, tabelle raggruppate per area con le relazioni; (3) l'architettura
(frontend cliente e admin, backend Spring Boot, Postgres, Stripe, Twilio/WhatsApp, email, Google login e Places).
Poi: risposte del titolare alle domande di PIANO_LAVORO.md §5, B-01 (scelta frontend) e B-02 (autenticazione). Su Fresha la disdetta è a 48h (da confermare; in `salon_settings` ora 24h).
In sospeso: magazzino (§4.8), buoni (§4.9); su Fresha non sono usati.
**2026-11-05 (pomeriggio):** board Miro https://miro.com/app/board/uXjVESMMmrI=/ con kanban dei task, domande al titolare,
schema DB e architettura. Decisi i messaggi (conferma email, promemoria email + WhatsApp, recensione WhatsApp con link
alla nostra piattaforma, compleanno email) → V9. Importati in locale da Fresha 1.821 recensioni (con voto ai
collaboratori) e 6.161 clienti con `scripts/fresha_*_to_sql.py` (dati in `data/`, fuori da git; istruzioni in OP_DB.md).
Importati anche catalogo (35 servizi), 40.171 appuntamenti e 32.263 vendite (98,7% dell'incasso Fresha) fino al
2026-10-31 con `scripts/fresha_history_to_sql.py`; ordine degli import in OP_DB.md. Collaboratori: Anna (Cresci) e Anna
Luisa (De Almeida) sono persone diverse; Fatima e Samanda non lavorano più al salone (cessate).
Importati anche orari di apertura e dati della sede (`data/import_salone.sql`) e 615 turni set–dic 2026 con settimana
tipo (`scripts/fresha_shifts_to_sql.py`). Saltati i turni di "Angelo Mastrogiovanni" e "MorresiHR Human Resource"
(nessun appuntamento: account non collaboratori?). Anna (Cresci) e Anna Luisa non hanno turni su Fresha.

Modo di lavorare con l'utente: spiegazioni in italiano, semplici e con esempi concreti; proporre, non decidere
da soli le scelte di dominio.

## Filosofia di codice
- Fai la soluzione più semplice che soddisfa il requisito attuale. Niente funzionalità "per il futuro".
- Non introdurre un'interfaccia se esiste una sola implementazione.
- Non usare design pattern (Factory, Builder, Strategy, Visitor...) a meno che
  io non lo chieda o che il codice duplicato in 3+ punti lo giustifichi chiaramente.
- Preferisci metodi semplici e classi concrete a gerarchie e generics elaborati.
- Non aggiungere layer, moduli o package nuovi senza chiedermelo.
- Non aggiungere dipendenze nuove senza chiedermelo.
- Segui lo stile e le convenzioni del codice già presente, anche se non è quello che sceglieresti.
- Modifica solo ciò che serve per il task: niente refactoring "già che ci sono".
- Niente gestione di errori o casi limite che non possono verificarsi.
- Se il task richiede più di ~3 file nuovi, fermati e proponi prima il piano.

## Java
- Usa le feature del linguaggio (record, stream semplici, Optional dove ha senso) ma senza eccessi.
- Evita reflection, AOP custom, annotation custom e generics complessi.
- Preferisci la soluzione già offerta dallo stack in uso (es. Spring) a un'astrazione costruita a mano.
