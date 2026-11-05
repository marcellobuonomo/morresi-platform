# Analisi Fresha e piano di lavoro

Analisi del 2026-11-05: cosa usa oggi il salone su Fresha, come dividerlo tra area cliente e area admin, cosa manca
al modello dati ([DATA_MODEL.md](DATA_MODEL.md) §4) e una timeline per Marcello e Andrea.
Fonte: account partner Fresha di Morresi Hair Stylist e pagina pubblica su fresha.com.

## 1. Il salone su Fresha, in breve

- Orari: mar–sab 9:00–19:00, giovedì fino alle 21:00; lunedì e domenica chiuso.
- 6 collaboratori in agenda, 8 membri del team in totale (titolare, HR, gestore).
- Voto 5,0 su 1.822 recensioni, richieste dal messaggio automatico dopo la visita.
- 1.595 nuovi clienti arrivati dal marketplace Fresha.
- Prenotazione online da 24 h a 5 mesi prima; disdetta o spostamento fino a 48 h prima; orari ogni 15 min.
- Pagamenti online non attivi: in salone contanti e carta; nessuna aliquota IVA impostata.

> Il marketplace Fresha porta molti clienti nuovi. Lasciando Fresha quel canale si perde: è una scelta del titolare,
> da tenere presente nel lancio (Prenota con Google, Instagram, sito).

## 2. Divisione delle funzioni

**Area cliente (Andrea)**
- Pagina del salone: foto, indirizzo, orari, servizi con prezzo "da", team con voto, recensioni
- Registrazione e accesso (email o Google), verifica del telefono
- Prenotazione: servizi, collaboratore o "chiunque", giorno e orario, note, conferma
- Testo "informazioni importanti" prima della conferma
- Le mie prenotazioni: disdici o sposta fino a 48 h prima, conferma presenza
- Acconto online del 10% (nuovo rispetto a Fresha)
- Recensione dopo l'appuntamento, con voto ai collaboratori
- Lista d'attesa (se decisa)

**Area admin (Marcello)**
- Home: vendite degli ultimi 7 giorni, prossimi appuntamenti, appuntamenti di oggi
- Agenda per collaboratore: crea, sposta, annulla, cambia stato, sovrapposizione forzata
- Cassa e vendite: conto, sconti, pagamenti, numerazione, correzioni
- Clienti: elenco, ricerca, scheda, provenienza, etichette, blocco no-show
- Catalogo: categorie, servizi, chi fa cosa, prezzo e durata per collaboratore, prodotti
- Team: collaboratori, turni, pause e ferie, settimana tipo, ruoli
- Statistiche: rendimento collaboratori, clienti top, vendite, annullati e no-show
- Impostazioni del salone, orari, chiusure

Proposta per bilanciare il carico: Andrea si prende anche le parti admin legate al cliente (notifiche, campagne email,
approvazione delle recensioni). L'area admin da sola è più grande dell'area cliente.

| Sezione Fresha | Usata dal salone | Nel nostro modello | Area |
|---|---|---|---|
| Calendario, stati appuntamento | sì, anche Arrivato e Iniziato | sì, senza Arrivato/Iniziato | admin |
| Motivi di cancellazione | sì, 3 motivi | no, tolti il 2026-11-03 | admin |
| Fasce bloccate (pranzo, formazione, riunione) | sì | sì, `staff_time_block` | admin |
| Cassa, vendite, pagamenti | sì, contanti e carta | sì, `sale` / `payment` | admin |
| Clienti: elenco, provenienze, etichette | sì, 7 provenienze | sì | admin |
| Segmenti clienti (nuovi, fedeli, inattivi, top, compleanni) | sì | calcolabili con query, nessuna tabella | admin |
| Team: ruoli e permessi | sì, 6 livelli | 4 ruoli (ADMIN, RECEPTION, STAFF, CLIENT) | admin |
| Fogli presenza, retribuzioni, provvigioni | non verificato | no, deciso così (premi fuori sistema) | — |
| Messaggi automatici | sì, 10 attivi | solo 3 tipi (conferma, promemoria, compleanno) | comune |
| Campagne di massa | sì, 4 via SMS, fino a ~880 clienti | sì, ma solo email | admin |
| Offerte e codici sconto | sì, 1 offerta (−20%, con codice) | no, solo sconto manuale in cassa | comune |
| Lista d'attesa | sì, prenotazione automatica | no | cliente |
| Prenotazioni di gruppo | attiva | no, un cliente per appuntamento | cliente |
| Profili team con foto, portfolio, stelle | sì | stelle sì (`review_staff_rating`); foto e bio no | cliente |
| Recensioni | sì, 1.822 | sì, più Google Places | comune |
| Report | 64 disponibili | da scegliere i nostri | admin |
| Gift card, pacchetti, abbonamenti | no (0 venduti / non attivi) | in sospeso, ok | — |
| Prodotti e magazzino | no (lista vuota) | solo elenco prodotti, magazzino in sospeso | — |
| Programma fedeltà, risorse (sedie, stanze) | no | no, ok | — |
| Pagamenti online, mance online | no | acconto Stripe sì, mance no | cliente |

## 3. Cosa manca al modello dati

Funzioni che il salone usa su Fresha e che il nostro modello oggi non copre. Per ognuna serve una decisione del
titolare prima di scrivere codice.

1. **Messaggi automatici in più.** Su Fresha sono attivi: appuntamento spostato, annullato, mancata presentazione,
   "grazie della visita" con link alla recensione, promemoria per riprenotare. Impatto: nuovi valori in
   `notification_log.type`. Il messaggio dopo la visita va contro la decisione "la reception chiede la recensione a
   voce", ma è probabilmente la fonte delle 1.822 recensioni.
   **Deciso (2026-11-05):** conferma via email, promemoria via email e WhatsApp, richiesta di recensione via WhatsApp
   con link personale alla nostra piattaforma (voto ai collaboratori già indicati), poi invito facoltativo a Google;
   compleanno via email; nessun altro messaggio. Migrazione V9.
2. **Lista d'attesa.** Attiva, con prenotazione automatica quando si libera un posto (primo in lista). Impatto: nuova
   tabella (cliente, servizi, collaboratore, giorni e fasce desiderati, stato) e due messaggi automatici.
3. **Campagne via SMS.** Il salone fa campagne SMS; noi abbiamo previsto solo email. Impatto: `channel` SMS su
   campagne e log; consenso SMS già presente su `client`.
4. **Codici sconto online.** Offerta "Feb Sale" −20% con codice promozionale. Impatto: tabella codici (percentuale o
   importo, validità, servizi) e campo sull'appuntamento o sulla vendita.
5. **Motivo di cancellazione e stati Arrivato / Iniziato.** Il salone li usa; li avevamo tolti il 2026-11-03.
   Impatto: un campo sull'appuntamento e due valori di stato. Da riconfermare col titolare.
6. **Prenotazione di gruppo.** Attiva su Fresha (es. mamma e figlia insieme). Impatto: più clienti per appuntamento
   oppure appuntamenti collegati. Da chiedere se viene usata davvero.
7. **Vetrina online.** Foto e bio del collaboratore, foto del servizio, servizi in evidenza, testo "informazioni
   importanti", link Instagram e sito. Impatto: pochi campi su `staff`, `service`, `salon_settings`, più dove salvare
   le immagini.
8. **Importazione dati da Fresha.** Migliaia di clienti e lo storico di appuntamenti e vendite, utile per le
   statistiche dal primo giorno. Impatto: un lavoro a sé (export Fresha → import); provenienza "Importata" già prevista.
   **Recensioni (verificato 2026-11-05):** 1.823, tutte Fresha (Google non collegato), voto medio 5,0. Ognuna ha nome del
   cliente, data, voto, testo, servizio e collaboratore ("Haircut/blow dry con Roberta"): il voto vale anche per il
   collaboratore. Fresha non ha un export delle recensioni (né in "Reputazione online" né tra i 64 report; il Data
   Connector costa 190 £/mese): vanno lette dalla pagina "Reputazione online" del partner con uno script.

### Valori da impostare (nessuna modifica al DB)

| Impostazione | Su Fresha | Default nostro |
|---|---|---|
| `cancellation_window_hours` | 48 h | 24 h (risponde alla domanda aperta sul limite di disdetta) |
| `min_notice_minutes` | 24 h | 60 min |
| `max_advance_days` | 5 mesi | 90 giorni |
| `slot_interval_minutes` | 15 min | 15 min |
| `reminder_hours_before` | 24 h | 24 h |
| IVA servizi e prodotti | nessuna aliquota | 20% (chiedere al commercialista se il salone è registrato IVA) |

## 4. Task e timeline

Tredici settimane di lavoro dal 2026-11-09, con entrambi a tempo pieno. È una stima: le feste di Natale e le
decisioni ancora aperte la spostano in avanti.

| ID | Task | Chi | Settimane | Dipende da |
|---|---|---|---|---|
| B-01 | Scegliere il frontend (un'unica app con due aree oppure due app) e la struttura delle API | insieme | S1 | — |
| B-02 | Login email/password e Google, conferma email, reset password, ruoli | Marcello | S1–S2 | B-01 |
| B-03 | Orari prenotabili: turni ∩ apertura − blocchi − appuntamenti, passo 15 min; salvataggio con controllo sovrapposizioni | Marcello | S5–S6 | A-01, A-02, A-03 |
| B-04 | Coda `notification_log`, invio programmato, WhatsApp (Twilio) ed email, testi en/it | Andrea | S9–S10 | B-03 |
| B-05 | Export da Fresha e import di clienti, storico e recensioni (con voto ai collaboratori) | Marcello | S12 | A-05, A-06 |
| B-06 | Collaudo e messa online | insieme | S13 | tutto |
| C-01 | Pagina del salone: foto, indirizzo, orari, link social | Andrea | S1–S2 | B-01 |
| C-02 | Registrazione cliente, completamento profilo, verifica telefono | Andrea | S2–S3 | B-02 |
| C-03 | Servizi per categoria con prezzo "da", collaboratori prenotabili | Andrea | S3–S4 | A-02 |
| C-04 | Prenotazione passo per passo; parte con dati finti finché B-03 non è pronto | Andrea | S4–S6 | B-03 |
| C-05 | Elenco prenotazioni, disdetta e spostamento fino a 48 h, conferma presenza | Andrea | S6–S7 | C-04 |
| C-06 | Pagina Stripe, webhook, stato in attesa di pagamento con scadenza, rimborso dell'acconto | Andrea | S8–S9 | C-04, A-06 |
| C-07 | Campagne email ai clienti con consenso, filtro per etichetta (admin) | Andrea | S10 | B-04 |
| C-08 | Pagina recensione dal link WhatsApp (senza login, collaboratori già indicati), invito a Google, approvazione e risposta dall'admin, recensioni Google | Andrea | S11 | C-05 |
| C-09 | Lista d'attesa con prenotazione automatica (solo se decisa) | Andrea | S12 | decisione del titolare |
| A-01 | Dati del salone, regole di prenotazione, orari settimanali, chiusure straordinarie | Marcello | S2 | B-02 |
| A-02 | Categorie, servizi, chi fa cosa con prezzo e durata per collaboratore | Marcello | S2–S3 | B-02 |
| A-03 | Collaboratori, turni, pause e ferie, settimana tipo, copia settimana | Marcello | S3–S4 | A-01 |
| A-04 | Agenda giorno/settimana per collaboratore, cambi di stato, sovrapposizione admin, vista del collaboratore | Marcello | S6–S7 | B-03 |
| A-05 | Elenco e ricerca clienti, scheda con storico, provenienza, etichette, blocco no-show | Marcello | S7 | B-02 |
| A-06 | Conto, righe, sconti, pagamenti, numerazione, correzioni, elenco prodotti | Marcello | S8–S9 | A-04 |
| A-07 | Home e statistiche: rendimento collaboratori, clienti top, vendite, annullati e no-show, segmenti | Marcello | S10–S11 | A-06 |

## 5. Da chiedere al titolare

| Domanda | Serve per |
|---|---|
| Disdetta a 48 h, prenotazione da 24 h a 5 mesi: restano come su Fresha? | A-01 |
| ~~Messaggio automatico dopo la visita con link alla recensione: lo vuole?~~ Sì, via WhatsApp (2026-11-05) | B-04, C-08 |
| ~~Altri messaggi automatici: spostato, annullato, no-show, invito a riprenotare?~~ No (2026-11-05) | B-04 |
| Campagne anche via SMS o solo email? | C-07 |
| Lista d'attesa, codici sconto, prenotazione di gruppo: li usa davvero? | C-04, C-09 |
| Motivo di cancellazione e stati Arrivato / Iniziato: servono? | A-04 |
| Il salone è registrato IVA nel Regno Unito? | A-02, A-06 |
| Vuole portare clienti e storico da Fresha? Fino a che anno? | B-05 |

Versione condivisibile (con timeline grafica): https://claude.ai/artifact/LkXiyLJLDgZGfqk2VM4v7X
