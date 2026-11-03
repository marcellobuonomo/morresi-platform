-- Notifiche, recensioni, registro operazioni delicate (DATA_MODEL.md §4.9)

CREATE TABLE marketing_campaign (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  version     bigint NOT NULL DEFAULT 0,
  name        text NOT NULL,
  subject     text NOT NULL,
  body        text NOT NULL,
  tag_id      uuid REFERENCES client_tag(id),   -- NULL = tutti i clienti con consenso email
  sent_at     timestamptz                       -- NULL = bozza
);

CREATE TABLE notification_log (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  version              bigint NOT NULL DEFAULT 0,
  type                 text NOT NULL CHECK (type IN ('BOOKING_CONFIRMATION','REMINDER','BIRTHDAY','CAMPAIGN',
                                                     'SALON_NEW_BOOKING','SALON_CANCELLATION')),
  channel              text NOT NULL CHECK (channel IN ('WHATSAPP','EMAIL')),
  client_id            uuid REFERENCES client(id),
  appointment_id       uuid REFERENCES appointment(id),
  campaign_id          uuid REFERENCES marketing_campaign(id),
  recipient            text NOT NULL,           -- numero E.164 o indirizzo email
  status               text NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','SENT','FAILED','SKIPPED')),
  scheduled_for        timestamptz NOT NULL,
  sent_at              timestamptz,
  provider_message_id  text,
  error                text
);
CREATE INDEX ix_notif_due ON notification_log (scheduled_for) WHERE status = 'SCHEDULED';
CREATE INDEX ix_notif_appointment ON notification_log (appointment_id);

CREATE TABLE review (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  version         bigint NOT NULL DEFAULT 0,
  appointment_id  uuid NOT NULL UNIQUE REFERENCES appointment(id),
  client_id       uuid NOT NULL REFERENCES client(id),
  rating          smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         text,
  salon_reply     text,
  published       boolean NOT NULL DEFAULT false
);

CREATE TABLE review_staff_rating (
  review_id  uuid NOT NULL REFERENCES review(id) ON DELETE CASCADE,
  staff_id   uuid NOT NULL REFERENCES staff(id),
  rating     smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  PRIMARY KEY (review_id, staff_id)
);
CREATE INDEX ix_review_staff_rating_staff ON review_staff_rating (staff_id);

-- Append-only: solo operazioni delicate
CREATE TABLE audit_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id  uuid NOT NULL REFERENCES app_user(id),
  action         text NOT NULL CHECK (action IN ('SALE_CORRECTED','REFUND','ROLE_CHANGED','CLIENT_DATA_DELETED')),
  entity_type    text NOT NULL,
  entity_id      uuid NOT NULL,
  details        jsonb NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_entity ON audit_log (entity_type, entity_id);
