-- Clienti (DATA_MODEL.md §4.5)

CREATE TABLE client_source (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  version     bigint NOT NULL DEFAULT 0,
  name        text NOT NULL UNIQUE,
  sort_order  int NOT NULL DEFAULT 0
);

CREATE TABLE client (
  id                             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                     timestamptz NOT NULL DEFAULT now(),
  updated_at                     timestamptz NOT NULL DEFAULT now(),
  version                        bigint NOT NULL DEFAULT 0,
  user_id                        uuid UNIQUE REFERENCES app_user(id),
  first_name                     text NOT NULL,
  last_name                      text,
  email                          citext,
  phone                          text,                -- E.164, non unico
  phone_verified_at              timestamptz,
  birth_date                     date,
  notes                          text,
  source_id                      uuid REFERENCES client_source(id),
  nationality                    char(2),             -- ISO 3166-1 alpha-2; 'IT' = messaggi in italiano
  marketing_email_consent_at     timestamptz,
  marketing_sms_consent_at       timestamptz,
  marketing_whatsapp_consent_at  timestamptz,
  online_booking_blocked_at      timestamptz,
  deleted_at                     timestamptz
);
CREATE UNIQUE INDEX ux_client_email ON client (email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX ix_client_search ON client USING gin
  ((coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(phone,'')) gin_trgm_ops);

CREATE TABLE client_tag (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  version     bigint NOT NULL DEFAULT 0,
  name        text NOT NULL UNIQUE
);

CREATE TABLE client_tag_assignment (
  client_id  uuid NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  tag_id     uuid NOT NULL REFERENCES client_tag(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, tag_id)
);
CREATE INDEX ix_client_tag_assignment_tag ON client_tag_assignment (tag_id);
