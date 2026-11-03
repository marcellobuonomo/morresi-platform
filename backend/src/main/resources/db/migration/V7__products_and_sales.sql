-- Prodotti, vendite e pagamenti (DATA_MODEL.md §4.7, §4.8)

CREATE TABLE product (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  version      bigint NOT NULL DEFAULT 0,
  name         text NOT NULL,
  brand        text,
  price_minor  bigint NOT NULL CHECK (price_minor >= 0),   -- IVA inclusa
  vat_rate_bp  int NOT NULL DEFAULT 2000,
  active       boolean NOT NULL DEFAULT true,
  deleted_at   timestamptz
);

-- Numerazione progressiva per anno (SELECT ... FOR UPDATE)
CREATE TABLE sale_sequence (
  year         int PRIMARY KEY,
  last_number  int NOT NULL DEFAULT 0
);

CREATE TABLE sale (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  version             bigint NOT NULL DEFAULT 0,
  appointment_id      uuid UNIQUE REFERENCES appointment(id),
  client_id           uuid REFERENCES client(id),
  status              text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','COMPLETED','CANCELLED')),
  number              text UNIQUE,                   -- assegnato al completamento, es. 2026/000123
  discount_minor      bigint NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
  total_minor         bigint NOT NULL DEFAULT 0,
  completed_at        timestamptz,
  created_by_user_id  uuid REFERENCES app_user(id)   -- NULL se aperta da una prenotazione online
);
CREATE INDEX ix_sale_client ON sale (client_id);
CREATE INDEX ix_sale_completed ON sale (completed_at);

CREATE TABLE sale_item (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  version              bigint NOT NULL DEFAULT 0,
  sale_id              uuid NOT NULL REFERENCES sale(id) ON DELETE CASCADE,
  item_type            text NOT NULL CHECK (item_type IN ('SERVICE','PRODUCT')),
  appointment_item_id  uuid REFERENCES appointment_item(id),
  service_id           uuid REFERENCES service(id),
  product_id           uuid REFERENCES product(id),
  staff_id             uuid REFERENCES staff(id),
  description          text NOT NULL,
  quantity             int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_minor     bigint NOT NULL CHECK (unit_price_minor >= 0),   -- IVA inclusa
  discount_minor       bigint NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
  vat_rate_bp          int NOT NULL,
  total_minor          bigint NOT NULL,
  CHECK ((item_type = 'SERVICE') = (service_id IS NOT NULL)),
  CHECK ((item_type = 'PRODUCT') = (product_id IS NOT NULL))
);
CREATE INDEX ix_sale_item_sale ON sale_item (sale_id);
CREATE INDEX ix_sale_item_staff ON sale_item (staff_id);

-- Saldo = PAYMENT riusciti - REFUND riusciti
CREATE TABLE payment (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  version             bigint NOT NULL DEFAULT 0,
  sale_id             uuid NOT NULL REFERENCES sale(id),
  kind                text NOT NULL DEFAULT 'PAYMENT' CHECK (kind IN ('PAYMENT','REFUND')),
  method              text NOT NULL CHECK (method IN ('CASH','CARD','ONLINE','BANK_TRANSFER','OTHER')),
  status              text NOT NULL DEFAULT 'SUCCEEDED' CHECK (status IN ('PENDING','SUCCEEDED','FAILED')),
  amount_minor        bigint NOT NULL CHECK (amount_minor > 0),
  stripe_reference    text UNIQUE,                   -- solo ONLINE
  paid_at             timestamptz,
  created_by_user_id  uuid REFERENCES app_user(id)
);
CREATE INDEX ix_payment_sale ON payment (sale_id);
