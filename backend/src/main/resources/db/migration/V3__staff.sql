-- Collaboratori e turni (DATA_MODEL.md §4.3)

CREATE TABLE staff (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  version          bigint NOT NULL DEFAULT 0,
  user_id          uuid UNIQUE REFERENCES app_user(id),   -- solo se accede al gestionale
  first_name       text NOT NULL,
  last_name        text,
  display_name     text NOT NULL,
  phone            text,
  job_title        text,
  calendar_color   char(7),
  bookable_online  boolean NOT NULL DEFAULT true,
  sort_order       int NOT NULL DEFAULT 0,
  deleted_at       timestamptz
);

-- Unica fonte per la disponibilità del collaboratore
CREATE TABLE staff_shift (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  version     bigint NOT NULL DEFAULT 0,
  staff_id    uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  CHECK (ends_at > starts_at)
);
CREATE INDEX ix_staff_shift_staff_starts ON staff_shift (staff_id, starts_at);

CREATE TABLE staff_time_block (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  version     bigint NOT NULL DEFAULT 0,
  staff_id    uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('TIME_OFF','SICK','BREAK','TRAINING','OTHER')),
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  reason      text,
  CHECK (ends_at > starts_at)
);
CREATE INDEX ix_staff_time_block_staff_starts ON staff_time_block (staff_id, starts_at);

CREATE TABLE shift_template (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  version        bigint NOT NULL DEFAULT 0,
  name           text NOT NULL,
  starts_minute  int NOT NULL CHECK (starts_minute BETWEEN 0 AND 1439),
  ends_minute    int NOT NULL CHECK (ends_minute BETWEEN 1 AND 1440),
  CHECK (ends_minute > starts_minute)
);

-- Serve solo a generare staff_shift
CREATE TABLE staff_week_pattern (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  version        bigint NOT NULL DEFAULT 0,
  staff_id       uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  weekday        smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  starts_minute  int NOT NULL CHECK (starts_minute BETWEEN 0 AND 1439),
  ends_minute    int NOT NULL CHECK (ends_minute BETWEEN 1 AND 1440),
  CHECK (ends_minute > starts_minute)
);
CREATE INDEX ix_staff_week_pattern_staff ON staff_week_pattern (staff_id);
