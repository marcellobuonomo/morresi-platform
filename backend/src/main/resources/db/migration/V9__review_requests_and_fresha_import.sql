-- Richiesta di recensione via WhatsApp con link personale, recensioni importate da Fresha (DATA_MODEL.md §4.9)

ALTER TABLE notification_log DROP CONSTRAINT notification_log_type_check;
ALTER TABLE notification_log ADD CONSTRAINT notification_log_type_check
  CHECK (type IN ('BOOKING_CONFIRMATION','REMINDER','BIRTHDAY','CAMPAIGN','REVIEW_REQUEST',
                  'SALON_NEW_BOOKING','SALON_CANCELLATION'));

-- Link della recensione senza login: solo hash, mai il token in chiaro
ALTER TABLE appointment ADD COLUMN review_token_hash text UNIQUE;

-- Le recensioni importate da Fresha possono non avere un nostro appuntamento o cliente
ALTER TABLE review ALTER COLUMN appointment_id DROP NOT NULL;
ALTER TABLE review ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE review ADD COLUMN source text NOT NULL DEFAULT 'PLATFORM' CHECK (source IN ('PLATFORM','FRESHA'));
ALTER TABLE review ADD COLUMN author_name text;   -- nome mostrato, per le importate
ALTER TABLE review ADD CONSTRAINT review_platform_links
  CHECK (source = 'FRESHA' OR (appointment_id IS NOT NULL AND client_id IS NOT NULL));
