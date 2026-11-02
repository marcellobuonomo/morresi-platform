# Booking Platform

Piattaforma SaaS multi-tenant per la gestione di appuntamenti, clienti, vendite e pagamenti per saloni e spa.
La specifica completa (dominio, modello dati, regole di business, piano a fasi) è in [DATA_MODEL.md](DATA_MODEL.md).

## Struttura

```
backend/             Spring Boot 4.1, Java 21, Maven
docker-compose.yml   PostgreSQL 17 + Mailpit per lo sviluppo locale
DATA_MODEL.md        specifica di riferimento
```

## Requisiti

- JDK 21
- Docker (per il database locale e per i test con Testcontainers)

Maven non serve installato: si usa il wrapper `mvnw`.

## Avvio in locale

```bash
docker compose up -d                 # postgres su 5432, mailpit su 8025
cd backend
./mvnw spring-boot:run               # Windows: mvnw.cmd spring-boot:run
```

- Health check: http://localhost:8080/actuator/health
- OpenAPI / Swagger UI: http://localhost:8080/swagger-ui.html
- Mail catcher: http://localhost:8025

La connessione al DB si configura con le variabili `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
(default allineati a `docker-compose.yml`).

In alternativa, senza docker compose, `TestBookingApplication` (in `src/test`) avvia l'app
con un Postgres effimero via Testcontainers.

## Test

```bash
cd backend
./mvnw verify
```

I test di integrazione usano un Postgres reale tramite Testcontainers: Docker deve essere in esecuzione.

## Branch

| Branch | Ruolo |
|---|---|
| `feature/dev` | sviluppo |
| `env/svil` | integrazione / ambiente di sviluppo condiviso |
| `master` | produzione |

Flusso: `feature/dev` → `env/svil` → `master`.

## Convenzioni

- Codice e identificatori in inglese; commenti e documentazione possono essere in italiano.
- Lo schema DB è gestito solo da migrazioni Flyway (`backend/src/main/resources/db/migration`), Hibernate in modalità `validate`.
