-- Stato Arrivato, motivo di cancellazione, prenotazione di gruppo, codici sconto, lista d'attesa, vetrina
-- (DATA_MODEL.md §4.2, §4.3, §4.6, §4.9)

ALTER TABLE appointment DROP CONSTRAINT appointment_status_check;
ALTER TABLE appointment ADD CONSTRAINT appointment_status_check
  CHECK (status IN ('PENDING_PAYMENT','BOOKED','CONFIRMED','ARRIVED','COMPLETED','CANCELLED','NO_SHOW'));

ALTER TABLE appointment ADD COLUMN cancellation_reason text
  CHECK (cancellation_reason IN ('CLIENT_UNAVAILABLE','MADE_BY_MISTAKE','DUPLICATE'));   -- NULL = nessun motivo

-- Prenotazione di gruppo: stesso valore per gli appuntamenti prenotati insieme
ALTER TABLE appointment ADD COLUMN group_id uuid;
CREATE INDEX ix_appt_group ON appointment (group_id) WHERE group_id IS NOT NULL;

-- Codici sconto, solo nella prenotazione online
CREATE TABLE discount_code (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  version      bigint NOT NULL DEFAULT 0,
  code         citext NOT NULL UNIQUE,
  description  text,
  percent_bp   int NOT NULL CHECK (percent_bp BETWEEN 1 AND 10000),   -- 2000 = -20%
  valid_from   date NOT NULL,
  valid_until  date NOT NULL,
  active       boolean NOT NULL DEFAULT true,
  CHECK (valid_until >= valid_from)
);
ALTER TABLE appointment ADD COLUMN discount_code_id uuid REFERENCES discount_code(id);

-- Lista d'attesa: si prenota da solo il primo in lista che va bene (BOOKED, senza acconto)
CREATE TABLE waitlist_entry (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  version         bigint NOT NULL DEFAULT 0,
  client_id       uuid NOT NULL REFERENCES client(id),
  staff_id        uuid REFERENCES staff(id),        -- NULL = qualsiasi collaboratore
  desired_date    date NOT NULL,
  from_minute     int CHECK (from_minute BETWEEN 0 AND 1439),   -- fascia desiderata; NULL = tutto il giorno
  to_minute       int CHECK (to_minute BETWEEN 1 AND 1440),
  status          text NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING','BOOKED','EXPIRED','CANCELLED')),
  appointment_id  uuid REFERENCES appointment(id),  -- l'appuntamento creato in automatico
  CHECK ((from_minute IS NULL) = (to_minute IS NULL) AND (to_minute IS NULL OR to_minute > from_minute))
);
CREATE INDEX ix_waitlist_waiting ON waitlist_entry (desired_date) WHERE status = 'WAITING';

CREATE TABLE waitlist_entry_service (
  waitlist_entry_id  uuid NOT NULL REFERENCES waitlist_entry(id) ON DELETE CASCADE,
  service_id         uuid NOT NULL REFERENCES service(id),
  PRIMARY KEY (waitlist_entry_id, service_id)
);

ALTER TABLE notification_log DROP CONSTRAINT notification_log_type_check;
ALTER TABLE notification_log ADD CONSTRAINT notification_log_type_check
  CHECK (type IN ('BOOKING_CONFIRMATION','REMINDER','BIRTHDAY','CAMPAIGN','REVIEW_REQUEST','WAITLIST_BOOKED',
                  'SALON_NEW_BOOKING','SALON_CANCELLATION'));

-- Vetrina: foto (percorso relativo alla cartella upload del server) e bio dei collaboratori, link Instagram
ALTER TABLE staff ADD COLUMN photo_path text;   -- NULL = avatar predefinito
ALTER TABLE staff ADD COLUMN bio text;
ALTER TABLE salon_settings ADD COLUMN instagram_url text;
