-- Catalogo servizi (DATA_MODEL.md §4.4)

CREATE TABLE service_category (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  version     bigint NOT NULL DEFAULT 0,
  name        text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0
);

CREATE TABLE service (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  version           bigint NOT NULL DEFAULT 0,
  category_id       uuid REFERENCES service_category(id),
  name              text NOT NULL,
  description       text,
  duration_minutes  int NOT NULL CHECK (duration_minutes > 0),
  price_minor       bigint NOT NULL CHECK (price_minor >= 0),   -- IVA inclusa
  price_type        text NOT NULL DEFAULT 'FIXED' CHECK (price_type IN ('FIXED','FROM')),
  vat_rate_bp       int NOT NULL DEFAULT 2000,
  online_bookable   boolean NOT NULL DEFAULT true,
  deposit_required  boolean NOT NULL DEFAULT false,
  sort_order        int NOT NULL DEFAULT 0,
  deleted_at        timestamptz
);

-- Chi può eseguire quale servizio, con prezzo/durata facoltativi (NULL = valore del servizio)
CREATE TABLE service_staff (
  service_id                 uuid NOT NULL REFERENCES service(id) ON DELETE CASCADE,
  staff_id                   uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  price_override_minor       bigint CHECK (price_override_minor >= 0),
  duration_override_minutes  int CHECK (duration_override_minutes > 0),
  PRIMARY KEY (service_id, staff_id)
);
CREATE INDEX ix_service_staff_staff ON service_staff (staff_id);
