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

## Branch
`feature/dev` (sviluppo) → `env/svil` (integrazione) → `master` (produzione).
Si lavora e si committa su `feature/dev`; merge verso `env/svil`/`master` solo su richiesta esplicita.

## Stato dei lavori (aggiornare a fine sessione)
**Fase attuale: revisione del modello dati, una entity alla volta.** L'utente approva ogni tabella con un "ok";
dopo ogni ok si aggiorna DATA_MODEL.md (marcatura ✅) e si committa. Le migrazioni Flyway si scrivono solo
dopo, quando il modello è approvato.

Approvati (2026-11-02): convenzioni comuni (passo 0), `app_user` / `user_identity` / `user_token`,
`salon_settings` / `opening_hours` / `schedule_exception`, `staff` / `staff_shift` / `staff_time_block` /
`shift_template` / `staff_week_pattern`. Decisa anche la sovrapposizione appuntamenti solo da ADMIN.
Approvato (2026-11-03): catalogo servizi `service_category` / `service` / `service_staff` (niente varianti, niente posa),
`client` / `client_source` / `client_tag` / `client_tag_assignment`, `appointment` / `appointment_item`
(sovrapposizione admin = `forced_overlap`; conferma dall'app solo per clienti registrati),
`sale_sequence` / `sale` / `sale_item` / `payment` (acconto 10% via Stripe, rimborsi = `payment` REFUND),
`product` (solo elenco prodotti; magazzino in sospeso finché il cliente non decide). Buoni in sospeso.
Notifiche `marketing_campaign` (solo email) / `notification_log`: WhatsApp a ogni cliente con telefono, lingua da
`client.nationality`, testi fissi en/it, avvisi email al salone.

**Ripartire da: recensioni (DATA_MODEL.md §4.9).** Valore del limite di disdetta da chiedere all'utente (è in `salon_settings`).

Ordine successivo: recensioni → tabelle di piattaforma. In sospeso: magazzino (§4.8), buoni (§4.9).

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
