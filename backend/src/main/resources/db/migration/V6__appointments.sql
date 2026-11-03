-- Appuntamenti (DATA_MODEL.md §4.6)

CREATE TABLE appointment (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  version               bigint NOT NULL DEFAULT 0,
  client_id             uuid REFERENCES client(id),     -- NULL = anonimo, solo da ADMIN
  status                text NOT NULL DEFAULT 'BOOKED'
    CHECK (status IN ('PENDING_PAYMENT','BOOKED','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW')),
  confirmed_at          timestamptz,
  starts_at             timestamptz NOT NULL,           -- = min(items.starts_at)
  ends_at               timestamptz NOT NULL,           -- = max(items.ends_at)
  client_notes          text,
  internal_notes        text,
  created_by_user_id    uuid NOT NULL REFERENCES app_user(id),
  cancelled_at          timestamptz,
  cancelled_by_user_id  uuid REFERENCES app_user(id),
  late_cancellation     boolean NOT NULL DEFAULT false,
  CHECK (ends_at > starts_at)
);
CREATE INDEX ix_appt_calendar ON appointment (starts_at);
CREATE INDEX ix_appt_client ON appointment (client_id, starts_at DESC);

CREATE TABLE appointment_item (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  version         bigint NOT NULL DEFAULT 0,
  appointment_id  uuid NOT NULL REFERENCES appointment(id) ON DELETE CASCADE,
  service_id      uuid NOT NULL REFERENCES service(id),
  staff_id        uuid NOT NULL REFERENCES staff(id),
  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz NOT NULL,
  service_name    text NOT NULL,                  -- copia al momento della prenotazione
  price_minor     bigint NOT NULL,                -- copia, con override del collaboratore
  sort_order      int NOT NULL DEFAULT 0,
  blocking        boolean NOT NULL DEFAULT true,  -- false quando l'appuntamento è CANCELLED/NO_SHOW
  forced_overlap  boolean NOT NULL DEFAULT false, -- sovrapposizione inserita da ADMIN
  CHECK (ends_at > starts_at)
);
CREATE INDEX ix_appt_item_appointment ON appointment_item (appointment_id);
CREATE INDEX ix_appt_item_staff_starts ON appointment_item (staff_id, starts_at);

-- Lo stesso collaboratore non può avere due righe sovrapposte, tranne quelle forzate dall'admin
ALTER TABLE appointment_item ADD CONSTRAINT no_staff_overlap
  EXCLUDE USING gist (staff_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
  WHERE (blocking AND NOT forced_overlap);
