# OP_DB — Operazioni sul database

Promemoria pratico per gestire il database PostgreSQL del progetto. Il modello dati è in [DATA_MODEL.md](DATA_MODEL.md) (§4).

## Database locale

| | |
|---|---|
| Server | PostgreSQL 18 installato su Windows (il progetto è pensato per PostgreSQL 17: non usare funzioni solo-18) |
| Host / porta | `localhost` / `5432` |
| Database | `morresi` |
| Utente / password | `morresi` / `morresi` (solo sviluppo locale) |
| Superutente | `postgres` (password personale, non scriverla qui) |
| psql | `C:\Program Files\PostgreSQL\18\bin\psql.exe` |

In alternativa a PostgreSQL installato: `docker compose up -d` dalla root del progetto avvia un Postgres 17 con gli stessi
dati di accesso (porta 5432: non tenerlo acceso insieme a quello installato).

### Creare utente e database (una volta sola, o dopo un reset)

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost `
  -c "CREATE USER morresi WITH PASSWORD 'morresi';" `
  -c "CREATE DATABASE morresi OWNER morresi;"
```

Le estensioni (`btree_gist`, `citext`, `pg_trgm`) le attiva la migrazione `V1`: non serve crearle a mano.

### Ricreare il database da zero

Cancella **tutti i dati** locali. L'applicazione deve essere ferma.

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost `
  -c "DROP DATABASE IF EXISTS morresi;" `
  -c "CREATE DATABASE morresi OWNER morresi;"
```

Al successivo avvio dell'applicazione Flyway ricrea tutte le tabelle.

## Migrazioni (Flyway)

- Cartella: `backend/src/main/resources/db/migration/`
- Nome file: `V<numero>__<descrizione>.sql` (due underscore), es. `V9__add_staff_bio.sql`. Numeri sempre crescenti.
- Si applicano **da sole all'avvio dell'applicazione**: Flyway legge la tabella `flyway_schema_history` ed esegue i file mancanti in ordine.
- **Mai modificare un file già applicato**: Flyway se ne accorge (checksum) e blocca l'avvio. Per cambiare lo schema si
  aggiunge un nuovo file `V<n+1>__...sql`.
- Anche i dati iniziali (DML) vanno nelle migrazioni (es. la riga di `salon_settings` in `V2`).
- Hibernate è in modalità `validate`: non crea né modifica tabelle, controlla solo che le entity corrispondano allo schema.

| Versione | Contenuto |
|---|---|
| V1 | estensioni `btree_gist`, `citext`, `pg_trgm` |
| V2 | `app_user`, `user_identity`, `user_token`, `salon_settings` (+ riga iniziale "MORRESI HAIRSTYLIST"), `opening_hours`, `schedule_exception` |
| V3 | `staff`, `staff_shift`, `staff_time_block`, `shift_template`, `staff_week_pattern` |
| V4 | `service_category`, `service`, `service_staff` |
| V5 | `client_source`, `client`, `client_tag`, `client_tag_assignment` |
| V6 | `appointment`, `appointment_item` + vincolo `no_staff_overlap` |
| V7 | `product`, `sale_sequence`, `sale`, `sale_item`, `payment` |
| V8 | `marketing_campaign`, `notification_log`, `review`, `review_staff_rating`, `audit_log` |
| V9 | tipo `REVIEW_REQUEST` in `notification_log`, `appointment.review_token_hash`, `review` importabili da Fresha (`source`, `author_name`) |
| V10 | stato `ARRIVED`, `appointment.cancellation_reason` / `group_id` / `discount_code_id`, `discount_code`, `waitlist_entry`, `waitlist_entry_service`, tipo `WAITLIST_BOOKED`, `staff.photo_path` / `bio`, `salon_settings.instagram_url` |

### Se una migrazione fallisce in locale

1. Correggere il file SQL che ha fallito (non è stato applicato, quindi si può modificare).
2. Se Flyway segna la versione come fallita in `flyway_schema_history`, la soluzione più semplice in locale è
   **ricreare il database da zero** (vedi sopra) e riavviare.

## Avviare l'applicazione (applica le migrazioni)

`JAVA_HOME` deve puntare al JDK 21 (il `java` predefinito del PC è l'11):

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21.0.9"
cd backend
.\mvnw.cmd spring-boot:run
```

Nel log cercare `Successfully applied N migrations` (o `Schema "public" is up to date`).
La connessione si può cambiare con le variabili `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.
Contratto delle API: http://localhost:8080/swagger-ui.html (JSON in `/v3/api-docs`).

## Avviare il frontend (Angular)

Serve Node.js (testato con Node 26). Con il backend acceso:

```powershell
cd frontend
npm install        # solo la prima volta o dopo modifiche a package.json
npm start          # http://localhost:4200, /api passa dal proxy al backend (proxy.conf.json)
```

- Agenda: http://localhost:4200/admin/agenda (giorno nell'URL, es. `?date=2026-10-31`).
- Dopo ogni modifica alle API, con il backend acceso: `npm run api` rigenera il client in `src/app/core/api`
  (file generati, da non modificare a mano).
- Test: `npx ng test --watch=false`.

## Controlli rapidi con psql

```powershell
$env:PGPASSWORD = "morresi"
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

# migrazioni applicate
& $psql -U morresi -h localhost -d morresi -c "SELECT version, description, success, installed_on FROM flyway_schema_history ORDER BY installed_rank;"

# elenco tabelle
& $psql -U morresi -h localhost -d morresi -c "\dt"

# impostazioni del salone
& $psql -U morresi -h localhost -d morresi -c "SELECT name, timezone, currency FROM salon_settings;"
```

## DBeaver

Nuova connessione → **PostgreSQL**:

| Campo | Valore |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `morresi` |
| Authentication | Database Native |
| Username / Password | `morresi` / `morresi` |

- Al primo collegamento DBeaver propone di scaricare il driver PostgreSQL: accettare.
- Le tabelle sono in `morresi` → `Schemas` → `public` → `Tables`.
- Per vedere lo schema come diagramma: tasto destro su `public` → **View Diagram**.
- Non modificare la struttura delle tabelle da DBeaver: ogni modifica di schema passa da una migrazione Flyway.

## Import recensioni da Fresha

Le recensioni di Fresha si estraggono dalla pagina "Reputazione online" del partner (sola lettura, vedi CLAUDE.md) in
`data/recensioni_fresha.json`. La cartella `data/` contiene dati personali ed è esclusa da git.

```powershell
python scripts/fresha_reviews_to_sql.py data/recensioni_fresha.json data/import_recensioni.sql
```

Poi si esegue `data/import_recensioni.sql` con DBeaver o psql. È ripetibile: cancella le recensioni con
`source = 'FRESHA'` e le reinserisce; crea in `staff` i collaboratori citati che mancano (confronto sul nome). Alla
messa online: nuova estrazione (per le recensioni arrivate nel frattempo), poi lo stesso script sul DB di produzione.

## Import clienti da Fresha

Export da Fresha: Clienti → Elenco dei clienti → Opzioni → Esporta → CSV, salvato in `data/clienti_fresha.csv`.

```powershell
python scripts/fresha_clients_to_sql.py data/clienti_fresha.csv data/import_clienti.sql
```

Poi si esegue `data/import_clienti.sql` con DBeaver o psql. Cancella tutti i clienti e li reinserisce: in locale si può
rilanciare finché nessun appuntamento/vendita/recensione punta ai clienti; in produzione si esegue una volta sola, a DB
vuoto, con un export fresco. Regole di unione, consensi, compleanni e lingua: in testa allo script.

## Import storico da Fresha (catalogo, appuntamenti, vendite, pagamenti)

Export da Fresha in `data/` (nomi dei file e percorsi in testa a `scripts/fresha_history_to_sql.py`), periodo dei
report fino al 2026-10-31.

```powershell
python scripts/fresha_history_to_sql.py data data/import_storico.sql
```

`data/import_storico.sql` (circa 20 MB: meglio psql che DBeaver) cancella e reinserisce catalogo servizi, appuntamenti,
vendite e pagamenti. Ordine completo di un import da zero:

1. `import_recensioni.sql` (crea anche i collaboratori citati)
2. `import_clienti.sql` (cancella anche lo storico, che punta ai clienti)
3. `import_storico.sql`
4. `import_turni.sql`: da `python scripts/fresha_shifts_to_sql.py data/fresha_scheduled-shifts.csv data/import_turni.sql`
   (report "Turni programmati" > CSV); turni e settimana tipo dei collaboratori già presenti
5. `import_salone.sql`: indirizzo, telefono, email e orari di apertura, scritto a mano in `data/` dalle pagine di Fresha
   (Impostazioni > Configurazione dell'attività > Sedi): dati del salone, quindi fuori dal codice

```powershell
$env:PGPASSWORD = "morresi"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U morresi -h localhost -d morresi -v ON_ERROR_STOP=1 -q -f data/import_storico.sql
```
