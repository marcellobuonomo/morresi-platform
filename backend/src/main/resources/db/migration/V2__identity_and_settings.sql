-- Identità, impostazioni del salone, orari (DATA_MODEL.md §4.2)

CREATE TABLE app_user (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  version            bigint NOT NULL DEFAULT 0,
  email              citext NOT NULL UNIQUE,
  password_hash      text,                -- null se registrato solo con Google
  role               text NOT NULL CHECK (role IN ('ADMIN','RECEPTION','STAFF','CLIENT')),
  status             text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DISABLED')),
  email_verified_at  timestamptz,
  last_login_at      timestamptz
);

CREATE TABLE user_identity (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  version           bigint NOT NULL DEFAULT 0,
  user_id           uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  provider          text NOT NULL CHECK (provider IN ('GOOGLE')),
  provider_subject  text NOT NULL,
  UNIQUE (provider, provider_subject)
);
CREATE INDEX ix_user_identity_user ON user_identity (user_id);

CREATE TABLE user_token (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  version     bigint NOT NULL DEFAULT 0,
  user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('EMAIL_VERIFICATION','PASSWORD_RESET')),
  token_hash  text NOT NULL UNIQUE,       -- solo hash, mai il token in chiaro
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz
);
CREATE INDEX ix_user_token_user ON user_token (user_id);

-- Una sola riga, creata qui sotto; l'admin può solo modificarla
CREATE TABLE salon_settings (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  version                    bigint NOT NULL DEFAULT 0,
  -- Identità
  name                       text NOT NULL,
  legal_name                 text,
  vat_number                 text,
  company_number             text,
  -- Contatti e indirizzo
  address_line               text,
  city                       text,
  postal_code                text,
  county                     text,
  phone                      text,
  email                      text,
  -- Localizzazione
  timezone                   text NOT NULL DEFAULT 'Europe/London',
  currency                   char(3) NOT NULL DEFAULT 'GBP',
  -- Regole di prenotazione online
  online_booking_enabled     boolean NOT NULL DEFAULT true,
  slot_interval_minutes      int NOT NULL DEFAULT 15 CHECK (slot_interval_minutes IN (5,10,15,20,30,60)),
  min_notice_minutes         int NOT NULL DEFAULT 60,
  max_advance_days           int NOT NULL DEFAULT 90,
  cancellation_window_hours  int NOT NULL DEFAULT 24,
  -- Anti no-show
  max_open_online_bookings   int NOT NULL DEFAULT 2,
  no_show_block_threshold    int NOT NULL DEFAULT 3,
  -- Pagamenti online e acconto
  online_payments_enabled    boolean NOT NULL DEFAULT false,
  deposit_percent_bp         int NOT NULL DEFAULT 1000,
  -- Notifiche
  reminder_hours_before      int NOT NULL DEFAULT 24,
  notification_email         text,
  -- Recensioni Google
  google_review_url          text,
  google_place_id            text
);
CREATE UNIQUE INDEX ux_salon_settings_single_row ON salon_settings ((true));

INSERT INTO salon_settings (name) VALUES ('MORRESI HAIRSTYLIST');

-- Minuti dall'inizio del giorno (0..1440); giorni senza righe = chiuso
CREATE TABLE opening_hours (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  version        bigint NOT NULL DEFAULT 0,
  weekday        smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),   -- ISO: 1 = lunedì
  opens_minute   int NOT NULL CHECK (opens_minute BETWEEN 0 AND 1439),
  closes_minute  int NOT NULL CHECK (closes_minute BETWEEN 1 AND 1440),
  CHECK (closes_minute > opens_minute)
);

CREATE TABLE schedule_exception (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  version     bigint NOT NULL DEFAULT 0,
  type        text NOT NULL CHECK (type IN ('CLOSED','OPEN')),
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  reason      text,
  CHECK (ends_at > starts_at)
);
CREATE INDEX ix_schedule_exception_starts ON schedule_exception (starts_at);
